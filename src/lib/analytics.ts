import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

/**
 * Datenschutzfreundliche Analytics-Abstraktion (Masterprompt §37):
 * - standardmäßig deaktiviert (features.analytics)
 * - nur tägliche Ereigniszähler, keine Cookies, keine personenbezogenen Daten
 * - Provider austauschbar: track() ist die einzige Schnittstelle
 */

export type AnalyticsEventName =
  | "job_angesehen"
  | "jobfilter_genutzt"
  | "bewerbung_gestartet"
  | "bewerbung_abgeschickt"
  | "empfehlung_gestartet"
  | "empfehlung_abgeschlossen"
  | "chat_gestartet"
  | "kontakt_cta_geklickt";

export async function track(name: AnalyticsEventName): Promise<void> {
  try {
    const enabled = await getSetting("features.analytics");
    if (!enabled) return;
    const day = new Date(new Date().toISOString().slice(0, 10));
    await db.analyticsEvent.upsert({
      where: { name_day: { name, day } },
      update: { count: { increment: 1 } },
      create: { name, day, count: 1 },
    });
  } catch {
    // Analytics darf niemals Funktionalität stören
  }
}
