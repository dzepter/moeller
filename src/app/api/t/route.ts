import { NextResponse, type NextRequest } from "next/server";
import { track, type AnalyticsEventName } from "@/lib/analytics";

const ALLOWED: AnalyticsEventName[] = ["bewerbung_gestartet", "kontakt_cta_geklickt"];

/** Minimaler Ereignis-Beacon (cookielos, keine PII; no-op solange Analytics deaktiviert). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { e?: string } | null;
  const event = ALLOWED.find((name) => name === body?.e);
  if (event) await track(event);
  return NextResponse.json({ ok: true });
}
