import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import {
  startOnboarding,
  resolveInvitation,
  revokeInvitation,
  sendInvitation,
  markLessonComplete,
  answerQuestion,
  tryComplete,
  listAssignments,
} from "@/server/academy/service";
import { createDraftVersion, publishVersion } from "@/server/academy/content";
import { runAcademyReminders } from "@/server/academy/reminders";
import { setSetting } from "@/lib/settings";
import { hashToken } from "@/lib/crypto";
import { createRegions, createUser, asCurrentUser, createCandidateWithApplication, INNENDIENST_PERMS, TEAMLEITER_PERMS, ADMIN_PERMS } from "../factory";
import { ForbiddenError } from "@/lib/rbac";

/** Mini-Kurs anlegen: 1 Modul, 2 Lektionen, 1 Frage. */
async function createCourse() {
  const course = await db.trainingCourse.create({ data: { slug: "admin-schulung", title: "Admin-Schulung" } });
  const version = await db.trainingCourseVersion.create({
    data: { courseId: course.id, version: 1, passScore: 80, publishedAt: new Date() },
  });
  const trainingModule = await db.trainingModule.create({
    data: { courseVersionId: version.id, sortOrder: 0, title: "Modul 1" },
  });
  const lesson1 = await db.trainingLesson.create({
    data: { moduleId: trainingModule.id, sortOrder: 0, title: "Lektion 1", content: { blocks: [] } },
  });
  const lesson2 = await db.trainingLesson.create({
    data: { moduleId: trainingModule.id, sortOrder: 1, title: "Lektion 2", content: { blocks: [] } },
  });
  const question = await db.trainingQuestion.create({
    data: {
      lessonId: lesson1.id,
      sortOrder: 0,
      question: "1+1?",
      explanation: "Es ist 2.",
      options: { create: [{ sortOrder: 0, text: "2", correct: true }, { sortOrder: 1, text: "3", correct: false }] },
    },
    include: { options: true },
  });
  return { course, version, lesson1, lesson2, question };
}

async function getToken(assignmentId: string): Promise<string> {
  // Token aus der Einladungs-E-Mail (Log) extrahieren
  const mail = await db.emailLog.findFirst({
    where: { template: "academy-einladung", relatedId: assignmentId },
    orderBy: { createdAt: "desc" },
  });
  const match = mail?.bodyText.match(/\/academy\/([A-Za-z0-9_-]{20,})/);
  if (!match?.[1]) throw new Error("Kein Token in Einladung gefunden");
  return match[1];
}

describe("Academy: Magic Link & Lebenszyklus", () => {
  it("Onboarding starten → Einladung → Link funktioniert nur für den Teilnehmer", async () => {
    const { nrw } = await createRegions();
    await createCourse();
    const { candidate } = await createCandidateWithApplication({ bundesland: "NRW", regionId: nrw.id, manualStatus: "ZUSAGE" });
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);

    const assignment = await startOnboarding(jana, candidate.id);
    expect(assignment.status).toBe("EINGELADEN");

    const token = await getToken(assignment.id);
    const invitation = await resolveInvitation(token);
    expect(invitation?.assignment.candidateId).toBe(candidate.id);

    // Erster Zugriff protokolliert, Status BEGONNEN
    const after = await db.trainingAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(after.status).toBe("BEGONNEN");
    expect(after.firstAccessAt).not.toBeNull();

    // Falscher Token → null
    expect(await resolveInvitation("falscher-token-000000000000")).toBeNull();
  });

  it("widerrufener Link funktioniert nicht mehr; Neu-Einladung ersetzt alten Token", async () => {
    const { nrw } = await createRegions();
    await createCourse();
    const { candidate } = await createCandidateWithApplication({ bundesland: "NRW", regionId: nrw.id });
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    const assignment = await startOnboarding(jana, candidate.id);
    const token1 = await getToken(assignment.id);

    await revokeInvitation(jana, assignment.id);
    expect(await resolveInvitation(token1)).toBeNull();

    await sendInvitation(jana, assignment.id);
    const token2 = await getToken(assignment.id);
    expect(token2).not.toBe(token1);
    expect(await resolveInvitation(token2)).not.toBeNull();
    expect(await resolveInvitation(token1)).toBeNull(); // alter Token bleibt tot
  });

  it("abgelaufener Link funktioniert nicht", async () => {
    const { nrw } = await createRegions();
    await createCourse();
    const { candidate } = await createCandidateWithApplication({ bundesland: "NRW", regionId: nrw.id });
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    const assignment = await startOnboarding(jana, candidate.id);
    const token = await getToken(assignment.id);
    await db.trainingInvitation.updateMany({
      where: { tokenHash: hashToken(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await resolveInvitation(token)).toBeNull();
  });
});

describe("Academy: Fortschritt, Quiz, Abschluss, Versionierung", () => {
  it("Fortschritt wird gespeichert; Abschluss nur nach allen Pflichtlektionen + bestandener Quote", async () => {
    const { nrw } = await createRegions();
    const { version, lesson1, lesson2, question } = await createCourse();
    const { candidate } = await createCandidateWithApplication({ bundesland: "NRW", regionId: nrw.id });
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    const assignment = await startOnboarding(jana, candidate.id);

    // Nur Lektion 1 abgeschlossen → 50 %
    const pct1 = await markLessonComplete(assignment.id, lesson1.id);
    expect(pct1).toBe(50);
    let result = await tryComplete(assignment.id);
    expect(result.done).toBe(false);
    expect(result.missingLessons).toBe(1);

    // Lektion 2 abschließen, Frage noch offen
    await markLessonComplete(assignment.id, lesson2.id);
    result = await tryComplete(assignment.id);
    expect(result.done).toBe(false);
    expect(result.missingQuestions).toBe(1);

    // Falsch antworten → Erklärung; letzte Antwort zählt
    const wrongOption = question.options.find((o) => !o.correct)!;
    const rightOption = question.options.find((o) => o.correct)!;
    const wrong = await answerQuestion(assignment.id, question.id, [wrongOption.id]);
    expect(wrong.correct).toBe(false);
    expect(wrong.explanation).toContain("2");
    result = await tryComplete(assignment.id);
    expect(result.done).toBe(false);
    expect(result.passed).toBe(false); // 0 % < 80 %

    const right = await answerQuestion(assignment.id, question.id, [rightOption.id]);
    expect(right.correct).toBe(true);
    result = await tryComplete(assignment.id);
    expect(result.done).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.scorePct).toBe(100);

    // Abschluss friert Version ein
    const completion = await db.trainingCompletion.findUniqueOrThrow({ where: { assignmentId: assignment.id } });
    expect(completion.courseVersionId).toBe(version.id);
    const finalAssignment = await db.trainingAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(finalAssignment.status).toBe("ABGESCHLOSSEN");
  });

  it("neue Kursversion überschreibt alte Abschlüsse nicht", async () => {
    const { nrw } = await createRegions();
    const { course, version, lesson1, lesson2, question } = await createCourse();
    const { candidate } = await createCandidateWithApplication({ bundesland: "NRW", regionId: nrw.id });
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    const admin = asCurrentUser(await createUser({ name: "Markus" }), ADMIN_PERMS);

    const assignment = await startOnboarding(jana, candidate.id);
    await markLessonComplete(assignment.id, lesson1.id);
    await markLessonComplete(assignment.id, lesson2.id);
    const right = question.options.find((o) => o.correct)!;
    await answerQuestion(assignment.id, question.id, [right.id]);
    await tryComplete(assignment.id);

    // Neue Version als Entwurf + veröffentlichen
    const draft = await createDraftVersion(admin, course.id);
    await publishVersion(admin, draft.id);

    // Alter Abschluss zeigt weiter auf v1
    const completion = await db.trainingCompletion.findUniqueOrThrow({ where: { assignmentId: assignment.id } });
    expect(completion.courseVersionId).toBe(version.id);

    // Neues Onboarding nutzt automatisch v2
    const { candidate: c2 } = await createCandidateWithApplication({ bundesland: "NRW", regionId: nrw.id });
    const assignment2 = await startOnboarding(jana, c2.id);
    expect(assignment2.courseVersionId).toBe(draft.id);
  });

  it("veröffentlichte Versionen sind eingefroren (kein zweiter Entwurf parallel)", async () => {
    await createRegions();
    const { course } = await createCourse();
    const admin = asCurrentUser(await createUser({ name: "Markus" }), ADMIN_PERMS);
    await createDraftVersion(admin, course.id);
    await expect(createDraftVersion(admin, course.id)).rejects.toThrow(/Entwurf/);
  });

  it("Teamleiter sieht nur Teilnehmer der eigenen wirksamen Regionen", async () => {
    const regions = await createRegions();
    await createCourse();
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);

    const nrwCand = await createCandidateWithApplication({ bundesland: "NRW", regionId: regions.nrw.id });
    const bayCand = await createCandidateWithApplication({ bundesland: "BAYERN", regionId: regions.bayern.id });
    await startOnboarding(jana, nrwCand.candidate.id);
    await startOnboarding(jana, bayCand.candidate.id);

    const tlNrw = await createUser({ name: "TL NRW", regionId: regions.nrw.id });
    const nrwUser = asCurrentUser(tlNrw, TEAMLEITER_PERMS, "NRW");
    const visible = await listAssignments(nrwUser);
    expect(visible.map((a) => a.candidate.id)).toEqual([nrwCand.candidate.id]);

    // Ohne Berechtigung: verboten
    const nobody = asCurrentUser(await createUser({ name: "Niemand" }), []);
    await expect(listAssignments(nobody)).rejects.toThrow(ForbiddenError);
  });
});

describe("Servicegrenzen: fremde Lesson/Question/Option wird abgelehnt (Defense-in-Depth)", () => {
  it("Assignment Version A + Inhalte aus Version B → keine Progress-/Answer-Zeile", async () => {
    const { nrw } = await createRegions();
    const { lesson1, question } = await createCourse();
    const { candidate } = await createCandidateWithApplication({ bundesland: "NRW", regionId: nrw.id });
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    const assignment = await startOnboarding(jana, candidate.id); // → Version A (v1)

    // Fremde Kursversion B mit eigener Lektion/Frage/Option
    const course = await db.trainingCourse.findFirstOrThrow({ where: { slug: "admin-schulung" } });
    const vB = await db.trainingCourseVersion.create({ data: { courseId: course.id, version: 2, passScore: 80 } });
    const modB = await db.trainingModule.create({ data: { courseVersionId: vB.id, sortOrder: 0, title: "B" } });
    const lessonB = await db.trainingLesson.create({ data: { moduleId: modB.id, sortOrder: 0, title: "B1", content: { blocks: [] } } });
    const questionB = await db.trainingQuestion.create({
      data: { lessonId: lessonB.id, sortOrder: 0, question: "B?", explanation: "B.", options: { create: [{ sortOrder: 0, text: "b", correct: true }] } },
      include: { options: true },
    });

    // Fremde Lektion → abgelehnt, kein Progress
    await expect(markLessonComplete(assignment.id, lessonB.id)).rejects.toThrow(ForbiddenError);
    expect(await db.trainingProgress.count({ where: { assignmentId: assignment.id } })).toBe(0);

    // Fremde Frage → abgelehnt, keine Antwort
    await expect(
      answerQuestion(assignment.id, questionB.id, [questionB.options[0]!.id]),
    ).rejects.toThrow(ForbiddenError);
    expect(await db.trainingAnswer.count({ where: { assignmentId: assignment.id } })).toBe(0);

    // Eigene Frage, aber Option-ID einer FREMDEN Frage → abgelehnt statt „falsch“
    await expect(
      answerQuestion(assignment.id, question.id, [questionB.options[0]!.id]),
    ).rejects.toThrow(ForbiddenError);
    expect(await db.trainingAnswer.count({ where: { assignmentId: assignment.id } })).toBe(0);

    // Kontrolle: legitime Nutzung funktioniert unverändert
    await markLessonComplete(assignment.id, lesson1.id);
    const right = question.options.find((o) => o.correct)!;
    const ok = await answerQuestion(assignment.id, question.id, [right.id]);
    expect(ok.correct).toBe(true);
  });
});

describe("K: Academy-Zugang endet mit der Anonymisierung des Kandidaten", () => {
  it("gültige Einladung → nach Anonymisierung kein Zugang mehr; Abschlussdaten bleiben", async () => {
    const { nrw } = await createRegions();
    await createCourse();
    const { candidate } = await createCandidateWithApplication({ bundesland: "NRW", regionId: nrw.id, manualStatus: "ZUSAGE" });
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    const assignment = await startOnboarding(jana, candidate.id);
    const token = await getToken(assignment.id);

    // Vorher: Link funktioniert
    expect(await resolveInvitation(token)).not.toBeNull();

    // Kandidat wird anonymisiert (Datenschutz-Löschung)
    await db.candidate.update({ where: { id: candidate.id }, data: { anonymizedAt: new Date() } });

    // Nachher: derselbe, formal noch gültige Magic-Link gewährt KEINEN Zugang mehr
    expect(await resolveInvitation(token)).toBeNull();

    // Historische Zuordnungsdaten (Assignment) bleiben datenschutzgerecht erhalten
    const kept = await db.trainingAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(kept.courseVersionId).toBeTruthy();
  });
});

describe("Academy: Erinnerungen", () => {
  it("erinnert Nicht-Starter mit frischem Magic-Link, nur einmal, nie nach Widerruf", async () => {
    const { nrw } = await createRegions();
    await createCourse();
    const jana = asCurrentUser(await createUser({ name: "Jana" }), INNENDIENST_PERMS);
    await setSetting("academy.reminders.enabled", true, jana.id);
    await setSetting("academy.reminders.notStartedAfterDays", 7, jana.id);

    const { candidate } = await createCandidateWithApplication({ bundesland: "NRW", regionId: nrw.id });
    const assignment = await startOnboarding(jana, candidate.id);

    // Noch keine 7 Tage → keine Erinnerung
    expect((await runAcademyReminders()).sent).toBe(0);

    // Einladung 8 Tage alt → genau eine Erinnerung, auch bei erneutem Lauf
    await db.trainingAssignment.update({
      where: { id: assignment.id },
      data: { invitedAt: new Date(Date.now() - 8 * 86_400_000) },
    });
    expect((await runAcademyReminders()).sent).toBe(1);
    expect((await runAcademyReminders()).sent).toBe(0);

    // Erinnerung enthält einen funktionierenden frischen Link
    const mail = await db.emailLog.findFirstOrThrow({
      where: { template: "academy-erinnerung", relatedId: assignment.id },
    });
    const token = mail.bodyText.match(/\/academy\/([A-Za-z0-9_-]{20,})/)?.[1];
    expect(token).toBeTruthy();
    expect(await resolveInvitation(token!)).not.toBeNull();

    // Widerruf entzieht den Zugang → zweiter Erinnerungstyp wird NICHT gesendet
    const { candidate: c2 } = await createCandidateWithApplication({ bundesland: "NRW", regionId: nrw.id });
    const a2 = await startOnboarding(jana, c2.id);
    await db.trainingAssignment.update({
      where: { id: a2.id },
      data: { invitedAt: new Date(Date.now() - 8 * 86_400_000) },
    });
    await revokeInvitation(jana, a2.id);
    expect((await runAcademyReminders()).sent).toBe(0);
  });
});
