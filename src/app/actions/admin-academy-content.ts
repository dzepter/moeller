"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";
import { createDraftVersion, publishVersion, saveLesson, saveQuestions } from "@/server/academy/content";
import type { ActionResult } from "@/app/actions/admin-candidates";

function fail(err: unknown): ActionResult {
  return { error: err instanceof Error && err.message.length < 300 ? err.message : "Aktion fehlgeschlagen." };
}

/** Formularvariante ohne State (für einfache <form action>). */
export async function createDraftAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const courseId = String(formData.get("courseId") ?? "");
  let draftId: string | null = null;
  try {
    const draft = await createDraftVersion(user, courseId);
    draftId = draft.id;
  } catch {
    revalidatePath("/admin/academy");
    return;
  }
  revalidatePath("/admin/academy");
  redirect(`/admin/academy/inhalte/${draftId}`);
}

export async function createDraftVersionAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Nicht angemeldet" };
  const courseId = String(formData.get("courseId") ?? "");
  let draftId: string;
  try {
    const draft = await createDraftVersion(user, courseId);
    draftId = draft.id;
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin/academy");
  redirect(`/admin/academy/inhalte/${draftId}`);
}

export async function publishVersionAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Nicht angemeldet" };
  try {
    await publishVersion(user, String(formData.get("versionId") ?? ""));
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/admin/academy");
  return { ok: true };
}

export async function saveLessonAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Nicht angemeldet" };
  const lessonId = String(formData.get("lessonId") ?? "");
  try {
    await saveLesson(user, lessonId, {
      title: String(formData.get("title") ?? "").trim().slice(0, 200),
      contentText: String(formData.get("contentText") ?? ""),
    });
    await saveQuestions(user, lessonId, String(formData.get("questionsText") ?? ""));
  } catch (err) {
    return fail(err);
  }
  revalidatePath(`/admin/academy/inhalte`);
  return { ok: true };
}
