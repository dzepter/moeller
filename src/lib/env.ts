// Zentraler, validierter Zugriff auf Umgebungsvariablen.
// Produktiv erzwingt der Startup-Check sichere Secrets.

const required = (name: string, fallback?: string): string => {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Umgebungsvariable ${name} fehlt`);
  return v;
};

export const env = {
  get nodeEnv() {
    return process.env.NODE_ENV ?? "development";
  },
  get isProd() {
    return this.nodeEnv === "production";
  },
  get baseUrl() {
    return (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get encryptionKey() {
    return required("APP_ENCRYPTION_KEY", "dev_only_0000000000000000000000000000000000000000000000000000000000");
  },
  get sessionPepper() {
    return required("SESSION_PEPPER", "dev_only_pepper_change_me");
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
  get schedulerEnabled() {
    return (process.env.SCHEDULER_ENABLED ?? "true") === "true";
  },
  /**
   * NUR für automatisierte Tests (E2E): deaktiviert Rate Limits.
   * Produktiv NIEMALS setzen – der Start protokolliert dann eine laute Warnung.
   */
  get rateLimitDisabled() {
    return process.env.RATE_LIMIT_DISABLED === "true";
  },
  email: {
    get provider() {
      return process.env.EMAIL_PROVIDER === "smtp" ? ("smtp" as const) : ("log" as const);
    },
    get from() {
      return process.env.EMAIL_FROM ?? "Möller GmbH <info@bvg-moeller.de>";
    },
    get smtp() {
      return {
        host: process.env.SMTP_HOST ?? "",
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        user: process.env.SMTP_USER ?? "",
        password: process.env.SMTP_PASSWORD ?? "",
      };
    },
  },
  malwareScanner: {
    /** "none" (Default, KEIN Schutz – nur dokumentiertes Restrisiko) oder "clamav" (clamd über TCP). */
    get provider() {
      return process.env.MALWARE_SCANNER === "clamav" ? ("clamav" as const) : ("none" as const);
    },
    get clamav() {
      return {
        host: process.env.CLAMAV_HOST ?? "127.0.0.1",
        port: Number(process.env.CLAMAV_PORT ?? 3310),
        timeoutMs: Number(process.env.CLAMAV_TIMEOUT_MS ?? 10_000),
      };
    },
  },
  storage: {
    get provider() {
      return process.env.STORAGE_PROVIDER === "s3" ? ("s3" as const) : ("local" as const);
    },
    get localRoot() {
      return process.env.STORAGE_LOCAL_ROOT ?? "./var/uploads";
    },
    get s3() {
      return {
        endpoint: process.env.S3_ENDPOINT ?? "",
        region: process.env.S3_REGION ?? "",
        bucketPublic: process.env.S3_BUCKET_PUBLIC ?? "",
        bucketPrivate: process.env.S3_BUCKET_PRIVATE ?? "",
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      };
    },
  },
};

/** Wirft in Produktion, wenn unsichere Dev-Defaults aktiv sind. */
export function assertProductionSecrets(): void {
  if (env.rateLimitDisabled) {
    console.warn(
      "⚠️  RATE_LIMIT_DISABLED=true – Rate Limits sind AUS. Nur für automatisierte Tests zulässig, niemals im Produktivbetrieb!",
    );
  }
  if (!env.isProd) return;
  if (env.encryptionKey.startsWith("dev_only") || env.encryptionKey.length < 64) {
    throw new Error("APP_ENCRYPTION_KEY muss produktiv gesetzt sein (64 Hex-Zeichen).");
  }
  if (env.sessionPepper.startsWith("dev_only") || env.sessionPepper.length < 16) {
    throw new Error("SESSION_PEPPER muss produktiv gesetzt sein.");
  }
}
