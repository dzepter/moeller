import { db } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/crypto";
import { getSetting } from "@/lib/settings";
import { sendMail } from "@/lib/email";
import { tplAcademyEinladung } from "@/lib/email/templates";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { hasPermission, ForbiddenError, getEffectiveRegionIds, type CurrentUser } from "@/lib/rbac";
import { regionForBundesland } from "@/lib/rbac";

/**
 * Möller Academy – Serverlogik.
 * Versionierungsregel: veröffentlichte Kursversionen sind eingefroren;
 * Assignments und Abschlüsse referenzieren ihre Version dauerhaft.
 */

// ---------------------------------------------------------------
// Admin: Zuweisung & Einladung
// ---------------------------------------------------------------

export async function getActiveCourseVersion(courseSlug = "admin-schulung") {
  return db.trainingCourseVersion.findFirst({
    where: { course: { slug: courseSlug, active: true }, publishedAt: { not: null } },
    orderBy: { version: "desc" },
    include: { course: true },
  });
}

/** „Onboarding starten": Assignment + Magic Link + E-Mail. */
export async function startOnboarding(user: CurrentUser, candidateId: string, courseVersionId?: string) {
  if (!hasPermission(user, "academy.manageParticipants")) throw new ForbiddenError();

  const candidate = await db.candidate.findUniqueOrThrow({ where: { id: candidateId } });
  if (candidate.anonymizedAt) throw new Error("Dieser Datensatz wurde anonymisiert.");

  const version = courseVersionId
    ? await db.trainingCourseVersion.findUniqueOrThrow({ where: { id: courseVersionId }, include: { course: true } })
    : await getActiveCourseVersion();
  if (!version || !version.publishedAt) {
    throw new Error("Es ist keine veröffentlichte Schulungsversion vorhanden.");
  }

  const responsibleRegionId = await regionForBundesland(candidate.bundesland);

  // Bestehendes offenes Assignment derselben Version wiederverwenden, sonst neu ("erneut zuweisen")
  let assignment = await db.trainingAssignment.findFirst({
    where: { candidateId, courseVersionId: version.id, status: { not: "ABGESCHLOSSEN" } },
  });
  if (!assignment) {
    assignment = await db.trainingAssignment.create({
      data: {
        candidateId,
        courseVersionId: version.id,
        responsibleRegionId,
        assignedById: user.id,
        status: "NICHT_EINGELADEN",
      },
    });
    await audit({
      action: "academy.assignment.created",
      actorId: user.id,
      entityType: "TrainingAssignment",
      entityId: assignment.id,
      meta: { course: version.course.slug, version: version.version },
    });
  }

  await sendInvitation(user, assignment.id);
  // frischen Stand zurückgeben (sendInvitation setzt Status/invitedAt)
  return db.trainingAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
}

/** Einladung (neu) versenden – alter Link wird widerrufen. */
export async function sendInvitation(user: CurrentUser, assignmentId: string) {
  if (!hasPermission(user, "academy.manageParticipants")) throw new ForbiddenError();
  const assignment = await db.trainingAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    include: { candidate: true, courseVersion: { include: { course: true } } },
  });

  const validityDays = await getSetting("academy.invitationValidityDays");
  const token = generateToken();

  await db.$transaction([
    db.trainingInvitation.updateMany({
      where: { assignmentId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    db.trainingInvitation.create({
      data: {
        assignmentId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + validityDays * 86_400_000),
        sentAt: new Date(),
        createdById: user.id,
      },
    }),
    db.trainingAssignment.update({
      where: { id: assignmentId },
      data: {
        invitedAt: assignment.invitedAt ?? new Date(),
        status: assignment.status === "NICHT_EINGELADEN" ? "EINGELADEN" : assignment.status,
      },
    }),
  ]);

  const mail = tplAcademyEinladung({
    firstName: assignment.candidate.firstName,
    courseTitle: assignment.courseVersion.course.title,
    link: `${env.baseUrl}/academy/${token}`,
    validDays: validityDays,
    contact: {
      hoursLabel: (await getSetting("contact.openingHours")).label,
      phone: await getSetting("contact.phone"),
    },
  });
  await sendMail({
    to: assignment.candidate.email,
    subject: mail.subject,
    text: mail.text,
    template: "academy-einladung",
    relatedType: "TrainingAssignment",
    relatedId: assignmentId,
  });
  await audit({ action: "academy.invitation.sent", actorId: user.id, entityType: "TrainingAssignment", entityId: assignmentId });
}

export async function revokeInvitation(user: CurrentUser, assignmentId: string) {
  if (!hasPermission(user, "academy.manageParticipants")) throw new ForbiddenError();
  await db.trainingInvitation.updateMany({ where: { assignmentId, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit({ action: "academy.invitation.revoked", actorId: user.id, entityType: "TrainingAssignment", entityId: assignmentId });
}

/** Teilnehmerliste mit Regions-Scope für Teamleiter. */
export async function listAssignments(user: CurrentUser, filter?: { status?: string; courseVersionId?: string }) {
  const canManage = hasPermission(user, "academy.manageParticipants");
  const canRegional = hasPermission(user, "academy.viewRegional");
  if (!canManage && !canRegional) throw new ForbiddenError();

  const where: Record<string, unknown> = {};
  if (!canManage) {
    const regionIds = await getEffectiveRegionIds(user);
    where.responsibleRegionId = { in: regionIds.length ? regionIds : ["__none__"] };
  }
  if (filter?.status) where.status = filter.status;
  if (filter?.courseVersionId) where.courseVersionId = filter.courseVersionId;

  return db.trainingAssignment.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      candidate: { select: { id: true, firstName: true, lastName: true, email: true, bundesland: true } },
      courseVersion: { include: { course: true } },
      completion: true,
      invitations: { where: { revokedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
      responsibleRegion: true,
    },
    take: 200,
  });
}

// ---------------------------------------------------------------
// Teilnehmer: Magic-Link-Zugang & Lernfortschritt
// ---------------------------------------------------------------

export async function resolveInvitation(token: string) {
  const invitation = await db.trainingInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      assignment: {
        include: {
          candidate: true,
          courseVersion: {
            include: {
              course: true,
              modules: {
                orderBy: { sortOrder: "asc" },
                include: {
                  lessons: {
                    orderBy: { sortOrder: "asc" },
                    include: { questions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } } },
                  },
                },
              },
            },
          },
          progress: true,
          answers: true,
          completion: true,
        },
      },
    },
  });
  if (!invitation || invitation.revokedAt || invitation.expiresAt < new Date()) return null;
  // Nach Anonymisierung des Kandidaten gewährt auch ein noch nicht abgelaufener
  // Magic-Link keinen Zugang mehr (Datenschutz: Zugang endet mit der Person).
  if (invitation.assignment.candidate.anonymizedAt) return null;

  const now = new Date();
  await db.$transaction([
    db.trainingInvitation.update({
      where: { id: invitation.id },
      data: { firstUsedAt: invitation.firstUsedAt ?? now, lastUsedAt: now },
    }),
    db.trainingAssignment.update({
      where: { id: invitation.assignmentId },
      data: {
        firstAccessAt: invitation.assignment.firstAccessAt ?? now,
        lastAccessAt: now,
        status: invitation.assignment.status === "EINGELADEN" ? "BEGONNEN" : invitation.assignment.status,
      },
    }),
  ]);
  return invitation;
}

async function recalcProgress(assignmentId: string): Promise<number> {
  const assignment = await db.trainingAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    include: {
      courseVersion: { include: { modules: { where: { required: true }, include: { lessons: { select: { id: true } } } } } },
      progress: { where: { completedAt: { not: null } }, select: { lessonId: true } },
    },
  });
  const requiredLessonIds = new Set(assignment.courseVersion.modules.flatMap((m) => m.lessons.map((l) => l.id)));
  const doneCount = assignment.progress.filter((p) => requiredLessonIds.has(p.lessonId)).length;
  const pct = requiredLessonIds.size ? Math.round((doneCount / requiredLessonIds.size) * 100) : 0;
  await db.trainingAssignment.update({
    where: { id: assignmentId },
    data: { progressPct: pct, status: pct >= 100 ? "IN_BEARBEITUNG" : undefined },
  });
  return pct;
}

export async function markLessonComplete(assignmentId: string, lessonId: string) {
  // Defense-in-Depth (zusätzlich zur Prüfung in den Actions): die Lektion
  // muss zur Kursversion GENAU dieses Assignments gehören – sonst wird
  // keinerlei Progress geschrieben.
  const [assignment, lesson] = await Promise.all([
    db.trainingAssignment.findUniqueOrThrow({ where: { id: assignmentId }, select: { courseVersionId: true } }),
    db.trainingLesson.findUnique({ where: { id: lessonId }, select: { module: { select: { courseVersionId: true } } } }),
  ]);
  if (!lesson || lesson.module.courseVersionId !== assignment.courseVersionId) {
    throw new ForbiddenError("Lektion gehört nicht zu diesem Kurs.");
  }
  await db.trainingProgress.upsert({
    where: { assignmentId_lessonId: { assignmentId, lessonId } },
    update: { completedAt: new Date() },
    create: { assignmentId, lessonId, completedAt: new Date() },
  });
  await db.trainingAssignment.update({
    where: { id: assignmentId },
    data: { status: "IN_BEARBEITUNG", lastAccessAt: new Date() },
  });
  return recalcProgress(assignmentId);
}

/** Antwort bewerten und speichern; liefert Korrektheit + Erklärung. */
export async function answerQuestion(assignmentId: string, questionId: string, selectedOptionIds: string[]) {
  const question = await db.trainingQuestion.findUniqueOrThrow({
    where: { id: questionId },
    include: { options: true, lesson: { select: { module: { select: { courseVersionId: true } } } } },
  });
  // Defense-in-Depth: Frage muss zur Kursversion dieses Assignments gehören …
  const assignment = await db.trainingAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    select: { courseVersionId: true },
  });
  if (question.lesson.module.courseVersionId !== assignment.courseVersionId) {
    throw new ForbiddenError("Frage gehört nicht zu diesem Kurs.");
  }
  // … und übergebene Option-IDs müssen Optionen GENAU dieser Frage sein –
  // fremde IDs werden abgelehnt statt still als „falsch“ gewertet.
  const validOptionIds = new Set(question.options.map((o) => o.id));
  if (selectedOptionIds.some((id) => !validOptionIds.has(id))) {
    throw new ForbiddenError("Ungültige Antwortoption.");
  }
  const correctIds = question.options.filter((o) => o.correct).map((o) => o.id).sort();
  const given = [...selectedOptionIds].sort();
  const correct = correctIds.length === given.length && correctIds.every((id, i) => id === given[i]);

  const attempts = await db.trainingAnswer.count({ where: { assignmentId, questionId } });
  await db.trainingAnswer.create({
    data: { assignmentId, questionId, selectedOptionIds, correct, attempt: attempts + 1 },
  });
  return { correct, explanation: question.explanation };
}

/**
 * Abschluss versuchen: alle Pflichtlektionen abgeschlossen + Wissenscheck-Quote
 * erreicht (je Frage zählt der letzte Antwortversuch).
 */
export async function tryComplete(assignmentId: string) {
  const assignment = await db.trainingAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    include: {
      courseVersion: {
        include: {
          modules: { include: { lessons: { include: { questions: { select: { id: true } } } } } },
        },
      },
      progress: { where: { completedAt: { not: null } } },
      answers: { orderBy: { answeredAt: "asc" } },
      completion: true,
    },
  });
  if (assignment.completion) return { done: true, passed: assignment.completion.passed, scorePct: assignment.completion.scorePct };

  const requiredLessons = assignment.courseVersion.modules
    .filter((m) => m.required)
    .flatMap((m) => m.lessons.map((l) => l.id));
  const doneLessons = new Set(assignment.progress.map((p) => p.lessonId));
  const missing = requiredLessons.filter((id) => !doneLessons.has(id));
  if (missing.length > 0) {
    return { done: false, missingLessons: missing.length };
  }

  const questionIds = assignment.courseVersion.modules.flatMap((m) => m.lessons.flatMap((l) => l.questions.map((q) => q.id)));
  const lastAnswer = new Map<string, boolean>();
  for (const answer of assignment.answers) lastAnswer.set(answer.questionId, answer.correct);
  const answered = questionIds.filter((id) => lastAnswer.has(id));
  if (answered.length < questionIds.length) {
    return { done: false, missingQuestions: questionIds.length - answered.length };
  }
  const correctCount = questionIds.filter((id) => lastAnswer.get(id)).length;
  const scorePct = questionIds.length ? Math.round((correctCount / questionIds.length) * 100) : 100;
  const passed = scorePct >= assignment.courseVersion.passScore;

  if (passed) {
    await db.$transaction([
      db.trainingCompletion.create({
        data: { assignmentId, courseVersionId: assignment.courseVersionId, scorePct, passed },
      }),
      db.trainingAssignment.update({ where: { id: assignmentId }, data: { status: "ABGESCHLOSSEN", progressPct: 100 } }),
    ]);
    await audit({
      action: "academy.completed",
      actorType: "SYSTEM",
      entityType: "TrainingAssignment",
      entityId: assignmentId,
      meta: { scorePct },
    });
  }
  return { done: passed, passed, scorePct };
}
