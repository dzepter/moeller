import { db } from "@/lib/db";
import type { Bundesland, CandidateSource } from "@prisma/client";

/** Reporting-Kennzahlen (Masterprompt §29) – bewusst ohne Altersdaten. */

export type ReportRange = { from: Date; to: Date };

export async function reportOverview(range: ReportRange) {
  const whereRange = { createdAt: { gte: range.from, lte: range.to }, anonymizedAt: null } as const;

  const [total, byBundesland, byJob, bySource, referralsTotal, referralsConverted, zusagen, absagen, open, statusFlow, firstTouch] =
    await Promise.all([
      db.application.count({ where: whereRange }),
      db.application.groupBy({ by: ["bundesland"], where: whereRange, _count: { _all: true } }),
      db.application.groupBy({ by: ["jobId"], where: whereRange, _count: { _all: true } }),
      db.application.groupBy({ by: ["source"], where: whereRange, _count: { _all: true } }),
      db.referral.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
      db.referral.count({
        where: { createdAt: { gte: range.from, lte: range.to }, status: "IN_BEWERBUNG_UEBERNOMMEN" },
      }),
      db.application.count({ where: { ...whereRange, manualStatus: "ZUSAGE" } }),
      db.application.count({ where: { ...whereRange, manualStatus: "ABSAGE" } }),
      db.application.count({ where: { anonymizedAt: null, manualStatus: null } }),
      db.application.groupBy({ by: ["manualStatus"], where: { ...whereRange, manualStatus: { not: null } }, _count: { _all: true } }),
      // Zeit bis zur ersten Bearbeitung: erste manuelle Statusänderung je Bewerbung
      db.$queryRaw<Array<{ avg_hours: number | null }>>`
        SELECT AVG(EXTRACT(EPOCH FROM (h."createdAt" - a."createdAt")) / 3600) AS avg_hours
        FROM "Application" a
        JOIN LATERAL (
          SELECT MIN("createdAt") AS "createdAt"
          FROM "ApplicationStatusHistory"
          WHERE "applicationId" = a.id AND "changedById" IS NOT NULL
        ) h ON h."createdAt" IS NOT NULL
        WHERE a."createdAt" BETWEEN ${range.from} AND ${range.to}
      `,
    ]);

  const jobIds = byJob.map((j) => j.jobId).filter((id): id is string => Boolean(id));
  const jobs = jobIds.length
    ? await db.job.findMany({ where: { id: { in: jobIds } }, select: { id: true, title: true } })
    : [];
  const jobTitle = new Map(jobs.map((j) => [j.id, j.title]));

  return {
    total,
    byBundesland: byBundesland.map((b) => ({ bundesland: b.bundesland as Bundesland, count: b._count._all })),
    byJob: byJob
      .map((j) => ({ title: j.jobId ? (jobTitle.get(j.jobId) ?? "Unbekannte Stelle") : "Initiativbewerbung", count: j._count._all }))
      .sort((a, b) => b.count - a.count),
    bySource: bySource.map((s) => ({ source: s.source as CandidateSource, count: s._count._all })),
    referralsTotal,
    referralsConverted,
    zusagen,
    absagen,
    open,
    statusFlow: statusFlow.map((s) => ({ status: s.manualStatus as string, count: s._count._all })),
    avgFirstTouchHours: firstTouch[0]?.avg_hours != null ? Math.round(Number(firstTouch[0].avg_hours) * 10) / 10 : null,
  };
}

/** CSV-Export (nur mit Berechtigung; Aufruf wird auditiert). */
export function overviewToCsv(data: Awaited<ReturnType<typeof reportOverview>>, range: ReportRange): string {
  const rows: string[][] = [
    ["Möller GmbH – Reporting", `${range.from.toISOString().slice(0, 10)} bis ${range.to.toISOString().slice(0, 10)}`],
    [],
    ["Kennzahl", "Wert"],
    ["Bewerbungen gesamt", String(data.total)],
    ["Zusagen", String(data.zusagen)],
    ["Absagen", String(data.absagen)],
    ["Offen (ohne manuellen Status, gesamt)", String(data.open)],
    ["Empfehlungen", String(data.referralsTotal)],
    ["Empfehlungen → Bewerbung", String(data.referralsConverted)],
    ["Ø Stunden bis Erstbearbeitung", data.avgFirstTouchHours != null ? String(data.avgFirstTouchHours) : "–"],
    [],
    ["Bewerbungen nach Bundesland", ""],
    ...data.byBundesland.map((b) => [b.bundesland, String(b.count)]),
    [],
    ["Bewerbungen nach Stelle", ""],
    ...data.byJob.map((j) => [j.title, String(j.count)]),
    [],
    ["Bewerbungen nach Quelle", ""],
    ...data.bySource.map((s) => [s.source, String(s.count)]),
    [],
    ["Status-Funnel", ""],
    ...data.statusFlow.map((s) => [s.status, String(s.count)]),
  ];
  return rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(";")).join("\r\n");
}
