import { db } from "@/lib/db";
import { hashIp } from "@/lib/crypto";

/**
 * DB-basiertes Fixed-Window-Rate-Limit mit optionaler Sperrzeit.
 * IPs werden ausschließlich als gesalzener Hash verarbeitet.
 */
export async function rateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
  blockSeconds?: number;
}): Promise<{ ok: boolean; remaining: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - params.windowSeconds * 1000);

  const bucket = await db.rateLimitBucket.findUnique({ where: { key: params.key } });

  if (bucket?.blockedUntil && bucket.blockedUntil > now) {
    return { ok: false, remaining: 0 };
  }

  if (!bucket || bucket.windowStartAt < windowStart) {
    await db.rateLimitBucket.upsert({
      where: { key: params.key },
      update: { windowStartAt: now, count: 1, blockedUntil: null },
      create: { key: params.key, windowStartAt: now, count: 1 },
    });
    return { ok: true, remaining: params.limit - 1 };
  }

  if (bucket.count >= params.limit) {
    if (params.blockSeconds) {
      await db.rateLimitBucket.update({
        where: { key: params.key },
        data: { blockedUntil: new Date(now.getTime() + params.blockSeconds * 1000) },
      });
    }
    return { ok: false, remaining: 0 };
  }

  const updated = await db.rateLimitBucket.update({
    where: { key: params.key },
    data: { count: { increment: 1 } },
  });
  return { ok: true, remaining: Math.max(0, params.limit - updated.count) };
}

/** Client-IP aus Request-Headern (hinter Proxy) als Hash. */
export function requestIpHash(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0]?.trim() : null) ?? headers.get("x-real-ip") ?? "unknown";
  return hashIp(ip ?? "unknown");
}
