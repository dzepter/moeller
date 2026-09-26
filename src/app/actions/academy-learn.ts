"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAcademySession } from "@/lib/academy-session";
import { markLessonComplete, answerQuestion, tryComplete } from "@/server/academy/service";

/** Teilnehmer-Aktionen: immer an die Cookie-Session gebunden, Lesson-Zugehörigkeit wird geprüft. */

async function requireSessionAndLesson(lessonId: string) {
  const session = await getAcademySession();
  if (!session) redirect("/academy");
  const lesson = await db.trainingLesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { courseVersionId: true } } },
  });
  if (!lesson || lesson.module.courseVersionId !== session.assignment.courseVersionId) {
    redirect("/academy/kurs");
  }
  return { session, lesson };
}

export async function completeLessonAction(formData: FormData): Promise<void> {
  const lessonId = String(formData.get("lessonId") ?? "");
  const nextHref = String(formData.get("nextHref") ?? "/academy/kurs");
  const { session } = await requireSessionAndLesson(lessonId);
  await markLessonComplete(session.assignmentId, lessonId);
  revalidatePath("/academy/kurs");
  redirect(nextHref.startsWith("/academy") ? nextHref : "/academy/kurs");
}

export type QuizState = { correct?: boolean; explanation?: string; error?: string } | null;

export async function answerQuestionAction(_prev: QuizState, formData: FormData): Promise<QuizState> {
  const lessonId = String(formData.get("lessonId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const selected = formData.getAll("option").map(String).filter(Boolean);
  if (!selected.length) return { error: "Bitte wähle eine Antwort aus." };
  const { session } = await requireSessionAndLesson(lessonId);

  const question = await db.trainingQuestion.findUnique({ where: { id: questionId }, select: { lessonId: true } });
  if (!question || question.lessonId !== lessonId) return { error: "Frage nicht gefunden." };

  const result = await answerQuestion(session.assignmentId, questionId, selected);
  return { correct: result.correct, explanation: result.correct ? undefined : result.explanation };
}

export type CompleteState = {
  done?: boolean;
  passed?: boolean;
  scorePct?: number;
  missingLessons?: number;
  missingQuestions?: number;
} | null;

export async function tryCompleteAction(_prev: CompleteState, _formData: FormData): Promise<CompleteState> {
  const session = await getAcademySession();
  if (!session) redirect("/academy");
  const result = await tryComplete(session.assignmentId);
  revalidatePath("/academy/kurs");
  return result;
}
