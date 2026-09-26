/**
 * Next.js Instrumentation: startet den internen Scheduler im Node-Prozess
 * und prüft produktive Secrets beim Start.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertProductionSecrets } = await import("@/lib/env");
  assertProductionSecrets();

  // Go-Live-Check: erkennt u. a. Rechtstext-Platzhalter und fehlende
  // Produktionskonfiguration und protokolliert sie als Blocker (Details im
  // Admin unter Einstellungen → Go-Live-Check). Wirft bewusst nicht: Inhalte
  // sind zur Laufzeit über das CMS korrigierbar.
  if (process.env.NODE_ENV === "production") {
    const { logGoLiveChecksAtStartup } = await import("@/server/golive");
    await logGoLiveChecksAtStartup();
  }

  if ((process.env.SCHEDULER_ENABLED ?? "true") === "true") {
    const { registerJobs, startScheduler } = await import("@/lib/scheduler");
    const { schedulerJobs } = await import("@/server/jobs-scheduler");
    registerJobs(schedulerJobs);
    startScheduler();
  }
}
