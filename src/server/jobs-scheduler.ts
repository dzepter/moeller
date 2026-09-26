import { db } from "@/lib/db";
import type { SchedulerJob } from "@/lib/scheduler";
import { retryFailedMails } from "@/lib/email";
import { runRetention } from "@/server/retention";
import { runAcademyReminders } from "@/server/academy/reminders";

/**
 * Registrierte Scheduler-Jobs (alle idempotent).
 */

/** 72h-Automatik: NEU → OFFEN, sofern kein manueller Status gesetzt wurde. */
export async function runStatusAutomation(now = new Date()): Promise<{ moved: number }> {
  const threshold = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const due = await db.application.findMany({
    where: { autoStatus: "NEU", manualStatus: null, createdAt: { lt: threshold } },
    select: { id: true },
  });
  for (const app of due) {
    await db.$transaction([
      db.application.update({ where: { id: app.id }, data: { autoStatus: "OFFEN" } }),
      db.applicationStatusHistory.create({
        data: { applicationId: app.id, fromAuto: "NEU", toAuto: "OFFEN", comment: "Automatik: älter als 72 Stunden" },
      }),
    ]);
  }
  return { moved: due.length };
}

/** Terminveröffentlichung und automatischer Ablauf von Stellen. */
export async function runJobPublishing(now = new Date()): Promise<{ published: number; expired: number }> {
  const toPublish = await db.job.updateMany({
    where: { status: "ENTWURF", publishAt: { not: null, lte: now } },
    data: { status: "VEROEFFENTLICHT", publishedAt: now, publishAt: null },
  });
  const toExpire = await db.job.updateMany({
    where: { status: "VEROEFFENTLICHT", autoDeactivate: true, expiresAt: { not: null, lt: now } },
    data: { status: "ARCHIVIERT" },
  });
  return { published: toPublish.count, expired: toExpire.count };
}

/** Geplante CMS-Veröffentlichung: Entwurf zum Termin publizieren. */
export async function runCmsScheduledPublish(now = new Date()): Promise<{ published: number }> {
  const pages = await db.cmsPage.findMany({
    where: { publishAt: { not: null, lte: now } },
    include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
  });
  let published = 0;
  for (const page of pages) {
    const latest = page.revisions[0];
    if (!latest) continue;
    await db.$transaction([
      db.cmsRevision.update({ where: { id: latest.id }, data: { publishedAt: now } }),
      db.cmsPage.update({
        where: { id: page.id },
        data: { publishedRevisionId: latest.id, publishAt: null },
      }),
    ]);
    published++;
  }
  return { published };
}

export const schedulerJobs: SchedulerJob[] = [
  { name: "status-automatik", everyMinutes: 5, run: () => runStatusAutomation() },
  { name: "job-veroeffentlichung", everyMinutes: 1, run: () => runJobPublishing() },
  { name: "cms-veroeffentlichung", everyMinutes: 1, run: () => runCmsScheduledPublish() },
  { name: "email-retry", everyMinutes: 5, run: async () => ({ retried: await retryFailedMails() }) },
  { name: "retention", everyMinutes: 60 * 24, run: () => runRetention() },
  { name: "academy-erinnerungen", everyMinutes: 60 * 6, run: () => runAcademyReminders() },
];
