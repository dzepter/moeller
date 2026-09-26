import { env } from "@/lib/env";
import { getPublishedContent } from "@/server/cms";

/**
 * Go-Live-Check: erkennt Zustände, mit denen die Plattform nicht produktiv
 * gehen darf (Blocker) oder die vor dem Start bewusst entschieden sein müssen
 * (Warnungen). Rechtstexte werden NIE automatisch befüllt – die echten Angaben
 * (Geschäftsführung, Registergericht, HRB, USt-ID, Datenschutzerklärung)
 * liefert der Betreiber und pflegt sie über das CMS ein.
 */

export type GoLiveFinding = {
  level: "BLOCKER" | "WARNUNG";
  bereich: string;
  text: string;
};

const PLACEHOLDER_MARKER = "[PLATZHALTER";

function scanContentForPlaceholders(content: unknown): boolean {
  return JSON.stringify(content ?? "").includes(PLACEHOLDER_MARKER);
}

export async function runGoLiveChecks(): Promise<GoLiveFinding[]> {
  const findings: GoLiveFinding[] = [];

  // Rechtstexte: Platzhalter sind harte Blocker für den Livegang.
  for (const [slug, name] of [
    ["impressum", "Impressum"],
    ["datenschutz", "Datenschutzerklärung"],
  ] as const) {
    const content = await getPublishedContent(slug);
    if (scanContentForPlaceholders(content)) {
      findings.push({
        level: "BLOCKER",
        bereich: name,
        text: `Der veröffentlichte Text enthält noch „${PLACEHOLDER_MARKER} …“-Markierungen. Echte Angaben (z. B. Geschäftsführung, Registergericht, HRB, USt-ID) müssen vom Betreiber geliefert und unter Website → ${name} eingepflegt werden.`,
      });
    }
  }

  // Konfiguration, ohne die der Betrieb erkennbar unvollständig ist.
  if (env.email.provider === "log") {
    findings.push({
      level: "BLOCKER",
      bereich: "E-Mail",
      text: "EMAIL_PROVIDER=log – es wird keine einzige E-Mail versendet (Eingangsbestätigungen, Magic-Links, Passwort-Reset). Für den Livegang SMTP konfigurieren.",
    });
  }
  if (env.baseUrl.includes("localhost")) {
    findings.push({
      level: "BLOCKER",
      bereich: "Basis-URL",
      text: "APP_BASE_URL zeigt auf localhost – Links in E-Mails, Sitemap und Academy-Einladungen wären unbrauchbar.",
    });
  }
  if (env.rateLimitDisabled) {
    findings.push({
      level: "BLOCKER",
      bereich: "Rate-Limits",
      text: "RATE_LIMIT_DISABLED=true ist gesetzt – sämtliche Rate-Limits (inkl. Login-Schutz) sind aus. Nur für automatisierte Tests zulässig.",
    });
  }
  if (env.malwareScanner.provider === "none") {
    findings.push({
      level: "WARNUNG",
      bereich: "Upload-Scan",
      text: "Es ist kein Malware-Scanner konfiguriert (MALWARE_SCANNER=none): Bewerber-Uploads werden NICHT auf Schadsoftware geprüft. Entweder ClamAV anbinden (MALWARE_SCANNER=clamav) oder dieses Restrisiko bewusst akzeptieren.",
    });
  }

  return findings;
}

/** Für den Serverstart: protokolliert Blocker laut, wirft aber nicht (Inhalte sind zur Laufzeit über das CMS korrigierbar). */
export async function logGoLiveChecksAtStartup(): Promise<void> {
  try {
    const findings = await runGoLiveChecks();
    for (const f of findings) {
      const line = `[go-live] ${f.level}: ${f.bereich} – ${f.text}`;
      if (f.level === "BLOCKER") console.error("⛔ " + line);
      else console.warn("⚠️  " + line);
    }
    if (findings.some((f) => f.level === "BLOCKER")) {
      console.error("⛔ [go-live] Diese Instanz ist NICHT freigabefähig. Details: Admin → Einstellungen → Go-Live-Check.");
    }
  } catch (err) {
    console.warn("[go-live] Prüfung beim Start nicht möglich:", err instanceof Error ? err.message : err);
  }
}
