import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { registerJobs, runAllJobs } from "@/lib/scheduler";
import { schedulerJobs } from "@/server/jobs-scheduler";

export const dynamic = "force-dynamic";

/**
 * Externer Scheduler-Trigger für Plattform-Cron (Kubernetes CronJob,
 * systemd-Timer …): POST mit `Authorization: Bearer <CRON_SECRET>`.
 *
 * Verhält sich exakt wie der interne Minuten-Tick: die everyMinutes-Intervalle
 * der Jobs werden RESPEKTIERT (kein force) – ein häufiger externer Trigger
 * führt Retention oder Academy-Erinnerungen also nicht öfter aus als
 * vorgesehen. Damit intervallgebundene Jobs zuverlässig getroffen werden,
 * muss ein externer Cron MINÜTLICH aufrufen (siehe README, Abschnitt
 * Scheduler/Cron – empfohlene Strategie ist der interne Tick).
 * Der transaktionsgebundene PostgreSQL Advisory Lock verhindert Doppelläufe
 * mit einem parallel aktiven internen Scheduler.
 * Ohne gesetztes CRON_SECRET ist der Endpunkt deaktiviert (404).
 */
export async function POST(req: Request): Promise<Response> {
  const secret = env.cronSecret;
  if (!secret) return new Response("Nicht verfügbar", { status: 404 });

  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("Keine Berechtigung", { status: 401 });
  }

  // Jobs explizit registrieren: die Route läuft ggf. in einer eigenen
  // Bundle-Einheit und darf sich nicht auf die Instrumentation verlassen.
  registerJobs(schedulerJobs);
  const results = await runAllJobs();
  return Response.json({ ok: true, results });
}
