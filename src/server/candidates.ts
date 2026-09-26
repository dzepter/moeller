import { db } from "@/lib/db";
import {
  applicationScope,
  canAccessApplication,
  hasPermission,
  ForbiddenError,
  type CurrentUser,
} from "@/lib/rbac";
import { audit } from "@/lib/audit";
import type { Bundesland, ManualStatus, Prisma, CandidateSource } from "@prisma/client";

/** Interner Bewerber-/Bewerbungs-Service. Jede Funktion prüft den Scope serverseitig. */

export type ApplicationListFilter = {
  status?: string; // NEU | OFFEN | GESPRAECH | <ManualStatus>
  bundesland?: Bundesland;
  regionId?: string;
  jobId?: string;
  source?: CandidateSource;
  type?: "STELLE" | "INITIATIV";
  q?: string;
  von?: string;
  bis?: string;
  wiedervorlage?: "aktiv";
  referral?: "ja";
};

export async function listApplications(user: CurrentUser, filter: ApplicationListFilter, page = 1, pageSize = 25) {
  const scope = await applicationScope(user);
  const where: Prisma.ApplicationWhereInput = { AND: [scope], anonymizedAt: null };
  const and = where.AND as Prisma.ApplicationWhereInput[];

  if (filter.status) {
    if (filter.status === "NEU") and.push({ autoStatus: "NEU", manualStatus: null });
    else if (filter.status === "OFFEN") and.push({ autoStatus: "OFFEN", manualStatus: null });
    else if (filter.status === "GESPRAECH")
      and.push({ manualStatus: { in: ["INTERESSENTENGESPRAECH_VEREINBART", "VERTRAGSGESPRAECH_VEREINBART"] } });
    else and.push({ manualStatus: filter.status as ManualStatus });
  }
  if (filter.bundesland) and.push({ bundesland: filter.bundesland });
  if (filter.regionId) and.push({ responsibleRegionId: filter.regionId });
  if (filter.jobId) and.push({ jobId: filter.jobId });
  if (filter.source) and.push({ source: filter.source });
  if (filter.type) and.push({ type: filter.type });
  if (filter.referral === "ja") and.push({ referralId: { not: null } });
  if (filter.wiedervorlage === "aktiv") and.push({ reminders: { some: { done: false } } });
  if (filter.von) and.push({ createdAt: { gte: new Date(filter.von) } });
  if (filter.bis) and.push({ createdAt: { lte: new Date(`${filter.bis}T23:59:59`) } });
  if (filter.q) {
    const q = filter.q.trim();
    and.push({
      candidate: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { city: { contains: q, mode: "insensitive" } },
        ],
      },
    });
  }

  const [total, items] = await Promise.all([
    db.application.count({ where }),
    db.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        candidate: true,
        job: { select: { id: true, title: true } },
        responsibleRegion: true,
        assignedUser: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { total, items, page, pageSize };
}

export async function getApplicationDetail(user: CurrentUser, applicationId: string) {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      candidate: {
        include: {
          notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
          files: true,
          applications: { select: { id: true, createdAt: true, jobId: true }, orderBy: { createdAt: "desc" } },
          trainingAssignments: {
            orderBy: { createdAt: "desc" },
            include: { courseVersion: { include: { course: true } }, completion: true },
          },
        },
      },
      job: true,
      responsibleRegion: true,
      assignedUser: { select: { id: true, name: true } },
      referral: true,
      cvFile: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
      assignments: { orderBy: { createdAt: "desc" }, include: { region: true, assignedBy: { select: { name: true } } } },
      reminders: { orderBy: { dueDate: "asc" }, include: { assignee: { select: { id: true, name: true } } } },
    },
  });
  if (!application) return null;
  if (!(await canAccessApplication(user, application))) throw new ForbiddenError();
  return application;
}

export async function changeStatus(
  user: CurrentUser,
  applicationId: string,
  manualStatus: ManualStatus,
  comment?: string,
) {
  if (!hasPermission(user, "candidates.write")) throw new ForbiddenError();
  const application = await db.application.findUniqueOrThrow({ where: { id: applicationId } });
  if (!(await canAccessApplication(user, application))) throw new ForbiddenError();

  await db.$transaction([
    db.application.update({
      where: { id: applicationId },
      data: { manualStatus, statusChangedAt: new Date() },
    }),
    db.applicationStatusHistory.create({
      data: {
        applicationId,
        fromAuto: application.manualStatus ? null : application.autoStatus,
        fromManual: application.manualStatus,
        toManual: manualStatus,
        changedById: user.id,
        comment: comment || null,
      },
    }),
  ]);
  await audit({
    action: "application.status.changed",
    actorId: user.id,
    entityType: "Application",
    entityId: applicationId,
    meta: { from: application.manualStatus ?? application.autoStatus, to: manualStatus },
  });
}

export async function reassignApplication(
  user: CurrentUser,
  applicationId: string,
  params: { regionId?: string; assignedUserId?: string | null; reason?: string },
) {
  if (!hasPermission(user, "candidates.assign")) throw new ForbiddenError();
  const application = await db.application.findUniqueOrThrow({ where: { id: applicationId } });
  if (!(await canAccessApplication(user, application))) throw new ForbiddenError();

  const regionId = params.regionId ?? application.responsibleRegionId;
  await db.$transaction([
    db.application.update({
      where: { id: applicationId },
      data: { responsibleRegionId: regionId, assignedUserId: params.assignedUserId ?? null },
    }),
    db.candidateAssignment.create({
      data: {
        applicationId,
        regionId,
        userId: params.assignedUserId ?? null,
        assignedById: user.id,
        reason: params.reason || null,
      },
    }),
  ]);
  await audit({
    action: "application.assigned",
    actorId: user.id,
    entityType: "Application",
    entityId: applicationId,
    meta: {
      fromRegion: application.responsibleRegionId,
      toRegion: regionId,
      toUser: params.assignedUserId ?? null,
      reason: params.reason ?? null,
    },
  });
}

export async function addNote(user: CurrentUser, params: { candidateId: string; applicationId?: string; body: string }) {
  if (!hasPermission(user, "candidates.write")) throw new ForbiddenError();
  await assertCandidateAccess(user, params.candidateId);
  const note = await db.candidateNote.create({
    data: { candidateId: params.candidateId, applicationId: params.applicationId, authorId: user.id, body: params.body },
  });
  await audit({ action: "note.created", actorId: user.id, entityType: "CandidateNote", entityId: note.id });
  return note;
}

export async function editNote(user: CurrentUser, noteId: string, body: string) {
  if (!hasPermission(user, "candidates.write")) throw new ForbiddenError();
  const note = await db.candidateNote.findUniqueOrThrow({ where: { id: noteId } });
  await assertCandidateAccess(user, note.candidateId);
  // Nachvollziehbares Audit: vorherige Fassung in editHistory aufbewahren
  const history = (note.editHistory as Array<Record<string, string>>) ?? [];
  history.push({ editedAt: new Date().toISOString(), editedById: user.id, previousBody: note.body });
  await db.candidateNote.update({
    where: { id: noteId },
    data: { body, editHistory: history as unknown as Prisma.InputJsonValue },
  });
  await audit({ action: "note.edited", actorId: user.id, entityType: "CandidateNote", entityId: noteId });
}

export async function createReminder(
  user: CurrentUser,
  params: {
    candidateId?: string;
    applicationId?: string;
    referralId?: string;
    dueDate: string;
    dueTime?: string;
    subject: string;
    assigneeId: string;
  },
) {
  if (!hasPermission(user, "candidates.write")) throw new ForbiddenError();
  if (params.candidateId) await assertCandidateAccess(user, params.candidateId);
  const reminder = await db.reminder.create({
    data: {
      candidateId: params.candidateId,
      applicationId: params.applicationId,
      referralId: params.referralId,
      dueDate: new Date(params.dueDate),
      dueTime: params.dueTime || null,
      subject: params.subject,
      assigneeId: params.assigneeId,
      createdById: user.id,
    },
  });
  await audit({ action: "reminder.created", actorId: user.id, entityType: "Reminder", entityId: reminder.id });
  return reminder;
}

export async function completeReminder(user: CurrentUser, reminderId: string) {
  if (!hasPermission(user, "candidates.write")) throw new ForbiddenError();
  const reminder = await db.reminder.findUniqueOrThrow({ where: { id: reminderId } });
  if (reminder.candidateId) await assertCandidateAccess(user, reminder.candidateId);
  await db.reminder.update({ where: { id: reminderId }, data: { done: true, doneAt: new Date() } });
  await audit({ action: "reminder.completed", actorId: user.id, entityType: "Reminder", entityId: reminderId });
}

async function assertCandidateAccess(user: CurrentUser, candidateId: string) {
  if (hasPermission(user, "candidates.read.all")) return;
  const scope = await applicationScope(user);
  const visible = await db.application.findFirst({ where: { ...scope, candidateId }, select: { id: true } });
  if (!visible) throw new ForbiddenError();
}

/** Kontrolliertes Zusammenführen zweier Kandidaten (kein Automatismus). */
export async function mergeCandidates(user: CurrentUser, primaryId: string, duplicateId: string) {
  if (!hasPermission(user, "candidates.read.all") || !hasPermission(user, "candidates.write")) {
    throw new ForbiddenError();
  }
  if (primaryId === duplicateId) throw new Error("Ein Datensatz kann nicht mit sich selbst zusammengeführt werden.");
  await db.$transaction([
    db.application.updateMany({ where: { candidateId: duplicateId }, data: { candidateId: primaryId } }),
    db.candidateNote.updateMany({ where: { candidateId: duplicateId }, data: { candidateId: primaryId } }),
    db.reminder.updateMany({ where: { candidateId: duplicateId }, data: { candidateId: primaryId } }),
    db.privateFile.updateMany({ where: { candidateId: duplicateId }, data: { candidateId: primaryId } }),
    db.consentRecord.updateMany({ where: { candidateId: duplicateId }, data: { candidateId: primaryId } }),
    db.trainingAssignment.updateMany({ where: { candidateId: duplicateId }, data: { candidateId: primaryId } }),
    db.candidate.delete({ where: { id: duplicateId } }),
  ]);
  await audit({
    action: "candidate.merged",
    actorId: user.id,
    entityType: "Candidate",
    entityId: primaryId,
    meta: { mergedFrom: duplicateId },
  });
}
