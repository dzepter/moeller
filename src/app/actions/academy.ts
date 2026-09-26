"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/rbac";
import { startOnboarding, sendInvitation, revokeInvitation } from "@/server/academy/service";
import type { ActionResult } from "@/app/actions/admin-candidates";

function fail(err: unknown): ActionResult {
  return { error: err instanceof Error && err.message.length < 250 ? err.message : "Aktion fehlgeschlagen." };
}

export async function startOnboardingAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Nicht angemeldet");
    const candidateId = String(formData.get("candidateId") ?? "");
    const courseVersionId = String(formData.get("courseVersionId") ?? "") || undefined;
    await startOnboarding(user, candidateId, courseVersionId);
    revalidatePath("/admin/academy");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function resendInvitationAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (assignmentId) {
    try {
      await sendInvitation(user, assignmentId);
    } catch {
      // Fehler bewusst still – UI zeigt Zustand über Listen-Refresh
    }
  }
  revalidatePath("/admin/academy");
}

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (assignmentId) {
    try {
      await revokeInvitation(user, assignmentId);
    } catch {
      /* s. o. */
    }
  }
  revalidatePath("/admin/academy");
}
