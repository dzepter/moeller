"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/rbac";
import {
  changeStatus,
  reassignApplication,
  addNote,
  editNote,
  createReminder,
  completeReminder,
  mergeCandidates,
} from "@/server/candidates";
import { findDuplicateHints } from "@/server/applications";

export type ActionResult = { ok?: boolean; error?: string } | null;

async function requireActionUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Nicht angemeldet");
  return user;
}

function fail(err: unknown): ActionResult {
  return { error: err instanceof Error && err.message.length < 200 ? err.message : "Aktion fehlgeschlagen." };
}

const statusSchema = z.object({
  applicationId: z.string().min(1),
  manualStatus: z.enum([
    "INTERESSENTENGESPRAECH_VEREINBART",
    "INTERESSENTENGESPRAECH_DURCHGEFUEHRT",
    "SCHNUPPERTAG_VEREINBART",
    "SCHNUPPERTAG_DURCHGEFUEHRT",
    "VERTRAGSGESPRAECH_VEREINBART",
    "VERTRAGSGESPRAECH_DURCHGEFUEHRT",
    "ZUSAGE",
    "ABSAGE",
  ]),
  comment: z.string().max(500).optional(),
});

export async function changeStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    const data = statusSchema.parse(Object.fromEntries(formData));
    await changeStatus(user, data.applicationId, data.manualStatus, data.comment);
    revalidatePath(`/admin/bewerbungen/${data.applicationId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

const assignSchema = z.object({
  applicationId: z.string().min(1),
  regionId: z.string().min(1),
  assignedUserId: z.string().optional(),
  reason: z.string().max(300).optional(),
});

export async function reassignAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    const data = assignSchema.parse(Object.fromEntries(formData));
    await reassignApplication(user, data.applicationId, {
      regionId: data.regionId,
      assignedUserId: data.assignedUserId || null,
      reason: data.reason,
    });
    revalidatePath(`/admin/bewerbungen/${data.applicationId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

const noteSchema = z.object({
  candidateId: z.string().min(1),
  applicationId: z.string().optional(),
  body: z.string().trim().min(1, "Bitte einen Text eingeben.").max(2000),
});

export async function addNoteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    const data = noteSchema.parse(Object.fromEntries(formData));
    await addNote(user, data);
    revalidatePath(`/admin/bewerbungen/${data.applicationId ?? ""}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

const editNoteSchema = z.object({
  noteId: z.string().min(1),
  applicationId: z.string().optional(),
  body: z.string().trim().min(1).max(2000),
});

export async function editNoteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    const data = editNoteSchema.parse(Object.fromEntries(formData));
    await editNote(user, data.noteId, data.body);
    revalidatePath(`/admin/bewerbungen/${data.applicationId ?? ""}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

const reminderSchema = z.object({
  candidateId: z.preprocess(emptyToUndefined, z.string().optional()),
  applicationId: z.preprocess(emptyToUndefined, z.string().optional()),
  referralId: z.preprocess(emptyToUndefined, z.string().optional()),
  dueDate: z.string().min(8, "Bitte ein Datum wählen."),
  dueTime: z.string().optional(),
  subject: z.string().trim().min(2, "Bitte einen Betreff angeben.").max(200),
  assigneeId: z.string().min(1, "Bitte eine verantwortliche Person wählen."),
});

export async function createReminderAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    const data = reminderSchema.parse(Object.fromEntries(formData));
    await createReminder(user, data);
    revalidatePath(`/admin/bewerbungen/${data.applicationId ?? ""}`);
    revalidatePath("/admin/wiedervorlagen");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function completeReminderAction(formData: FormData): Promise<void> {
  const user = await requireActionUser();
  const reminderId = String(formData.get("reminderId") ?? "");
  if (reminderId) await completeReminder(user, reminderId);
  revalidatePath("/admin/wiedervorlagen");
  const applicationId = String(formData.get("applicationId") ?? "");
  if (applicationId) revalidatePath(`/admin/bewerbungen/${applicationId}`);
}

export async function mergeCandidatesAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    const primaryId = String(formData.get("primaryId") ?? "");
    const duplicateId = String(formData.get("duplicateId") ?? "");
    await mergeCandidates(user, primaryId, duplicateId);
    revalidatePath("/admin/bewerbungen");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function duplicateHintsAction(candidateId: string) {
  const user = await requireActionUser();
  // Scope-Prüfung passiert im Service: fremde Candidate-IDs → ForbiddenError,
  // Treffer bleiben auf den Sichtbarkeitsbereich des Benutzers beschränkt.
  return findDuplicateHints(user, candidateId);
}
