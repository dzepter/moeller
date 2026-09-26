import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

/**
 * Interner Scheduler: Minuten-Tick, gegen Doppelausführung in mehreren
 * Instanzen per PostgreSQL Advisory Lock abgesichert. Jobs sind idempotent.
 * Alternativ kann eine externe Plattform `POST /api/cron/run` (CRON_SECRET)
 * aufrufen – dieselbe runAllJobs()-Logik.
 */

export type SchedulerJob = {
  name: string;
  /** Ausführen, wenn Minute % everyMinutes === 0 */
  everyMinutes: number;
  run: () => Promise<Record<string, number> | void>;
};

const LOCK_KEY = 7_25_919_350; // projektspezifische Advisory-Lock-ID

const registry: SchedulerJob[] = [];

export function registerJobs(jobs: SchedulerJob[]): void {
  registry.splice(0, registry.length, ...jobs);
}

export async function runAllJobs(opts?: { force?: boolean }): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};
  const minute = Math.floor(Date.now() / 60_000);

  // Transaktionsgebundener Advisory Lock: Session-Locks über den Connection-
  // Pool wären fehleranfällig (Lock und Unlock können auf unterschiedlichen
  // Verbindungen landen). Der xact-Lock wird beim Commit automatisch frei.
  return await db.$transaction(
    async (tx) => {
      const lock = await tx.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_xact_lock(${LOCK_KEY}) AS locked`;
      if (!lock[0]?.locked) return { skipped: "lock" };

      for (const job of registry) {
        if (!opts?.force && minute % job.everyMinutes !== 0) continue;
        try {
          const res = await job.run();
          results[job.name] = res ?? "ok";
          if (res && Object.values(res).some((v) => v > 0)) {
            await audit({ action: "system.scheduler.run", actorType: "SYSTEM", meta: { job: job.name, ...res } });
          }
        } catch (err) {
          results[job.name] = `Fehler: ${err instanceof Error ? err.message : "unbekannt"}`;
          console.error(`[scheduler] Job ${job.name} fehlgeschlagen`, err);
        }
      }
      return results;
    },
    // Jobs laufen über den globalen Client außerhalb dieser Transaktion;
    // sie hält nur den Lock. Timeout großzügig für langsame Läufe.
    { timeout: 10 * 60_000, maxWait: 10_000 },
  );
}

let started = false;

export function startScheduler(): void {
  if (started) return;
  started = true;
  // Erste Ausführung kurz nach dem Start, danach im Minutentakt
  setTimeout(() => {
    void runAllJobs();
  }, 15_000);
  setInterval(() => {
    void runAllJobs();
  }, 60_000);
  console.info("[scheduler] gestartet (Minutentakt)");
}
