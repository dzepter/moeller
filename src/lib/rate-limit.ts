import { db } from "@/lib/db";
import { hashIp } from "@/lib/crypto";
import { env } from "@/lib/env";

/**
 * DB-basiertes Fixed-Window-Rate-Limit mit optionaler Sperrzeit.
 * IPs werden ausschließlich als gesalzener Hash verarbeitet.
 *
 * Concurrency: Zählen, Fenster-Reset und Sperr-Prüfung passieren in EINEM
 * atomaren Upsert – PostgreSQL serialisiert parallele Requests über die
 * Zeilensperre des Buckets, Races können das Limit nicht umgehen.
 */
export async function rateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
  blockSeconds?: number;
}): Promise<{ ok: boolean; remaining: number }> {
  // Test-Schalter (nie in Produktion aktiv, siehe env.rateLimitDisabled)
  if (env.rateLimitDisabled) return { ok: true, remaining: params.limit };

  const windowStart = new Date(Date.now() - params.windowSeconds * 1000);

  const rows = await db.$queryRaw<Array<{ count: number; blockedUntil: Date | null }>>`
    INSERT INTO "RateLimitBucket" ("key", "windowStartAt", "count", "updatedAt")
    VALUES (${params.key}, now(), 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."blockedUntil" IS NOT NULL AND "RateLimitBucket"."blockedUntil" > now()
          THEN "RateLimitBucket"."count"
        WHEN "RateLimitBucket"."windowStartAt" < ${windowStart} THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "windowStartAt" = CASE
        WHEN "RateLimitBucket"."blockedUntil" IS NOT NULL AND "RateLimitBucket"."blockedUntil" > now()
          THEN "RateLimitBucket"."windowStartAt"
        WHEN "RateLimitBucket"."windowStartAt" < ${windowStart} THEN now()
        ELSE "RateLimitBucket"."windowStartAt"
      END,
      "blockedUntil" = CASE
        WHEN "RateLimitBucket"."blockedUntil" IS NOT NULL AND "RateLimitBucket"."blockedUntil" > now()
          THEN "RateLimitBucket"."blockedUntil"
        WHEN "RateLimitBucket"."windowStartAt" < ${windowStart} THEN NULL
        ELSE "RateLimitBucket"."blockedUntil"
      END,
      "updatedAt" = now()
    RETURNING "count", "blockedUntil"
  `;

  const row = rows[0];
  if (!row) return { ok: false, remaining: 0 };

  if (row.blockedUntil && row.blockedUntil > new Date()) return { ok: false, remaining: 0 };

  if (row.count > params.limit) {
    if (params.blockSeconds) {
      // Sperre setzen (idempotent; nur wenn nicht bereits gesperrt)
      await db.$executeRaw`
        UPDATE "RateLimitBucket"
        SET "blockedUntil" = now() + make_interval(secs => ${params.blockSeconds}), "updatedAt" = now()
        WHERE "key" = ${params.key} AND ("blockedUntil" IS NULL OR "blockedUntil" < now())
      `;
    }
    return { ok: false, remaining: 0 };
  }
  return { ok: true, remaining: Math.max(0, params.limit - row.count) };
}

/**
 * Client-IP aus Request-Headern als gesalzener Hash.
 *
 * VERTRAUENSMODELL (siehe README „Deployment“): Die Anwendung MUSS hinter
 * einem vertrauenswürdigen Reverse Proxy laufen, der X-Real-IP setzt bzw.
 * X-Forwarded-For um die echte Client-IP ERGÄNZT und Client-gelieferte Werte
 * nicht ungefiltert durchreicht. Deshalb zählt hier bewusst X-Real-IP bzw.
 * der LETZTE Eintrag von X-Forwarded-For (vom eigenen Proxy angehängt) – der
 * erste Eintrag wäre vom Client frei wählbar und würde das Limit aushebeln.
 * Ohne Proxy-Header werden alle Requests konservativ demselben Bucket
 * („unknown“) zugerechnet, statt einem spoofbaren Wert zu vertrauen.
 */
export function requestIpHash(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return hashIp(realIp);
  const fwd = headers.get("x-forwarded-for");
  const last = fwd?.split(",").map((s) => s.trim()).filter(Boolean).at(-1);
  return hashIp(last || "unknown");
}
