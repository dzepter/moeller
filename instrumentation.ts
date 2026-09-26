/**
 * Next.js Instrumentation: startet den internen Scheduler im Node-Prozess
 * und prüft produktive Secrets beim Start.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertProductionSecrets } = await import("@/lib/env");
  assertProductionSecrets();

  if ((process.env.SCHEDULER_ENABLED ?? "true") === "true") {
    const { registerJobs, startScheduler } = await import("@/lib/scheduler");
    const { schedulerJobs } = await import("@/server/jobs-scheduler");
    registerJobs(schedulerJobs);
    startScheduler();
  }
}
