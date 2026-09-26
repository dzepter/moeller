"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/rbac";
import { changeReferralStatus, convertReferral } from "@/server/referrals-admin";
import type { ActionResult } from "@/app/actions/admin-candidates";

const statusSchema = z.object({
  referralId: z.string().min(1),
  toStatus: z.enum(["EMPFEHLUNG_NEU", "KONTAKT_AUSSTEHEND", "KONTAKTIERT", "INTERESSE", "KEIN_INTERESSE"]),
  comment: z.string().max(300).optional(),
});

export async function referralStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Nicht angemeldet");
    const data = statusSchema.parse(Object.fromEntries(formData));
    await changeReferralStatus(user, data.referralId, data.toStatus, data.comment);
    revalidatePath(`/admin/empfehlungen/${data.referralId}`);
    revalidatePath("/admin/empfehlungen");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error && err.message.length < 250 ? err.message : "Aktion fehlgeschlagen." };
  }
}

export async function convertReferralAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Nicht angemeldet" };
  const referralId = String(formData.get("referralId") ?? "");
  const linkCandidateId = String(formData.get("linkCandidateId") ?? "") || undefined;
  let applicationId: string;
  try {
    const result = await convertReferral(user, referralId, { linkCandidateId });
    applicationId = result.application.id;
  } catch (err) {
    return { error: err instanceof Error && err.message.length < 250 ? err.message : "Übernahme fehlgeschlagen." };
  }
  revalidatePath("/admin/empfehlungen");
  redirect(`/admin/bewerbungen/${applicationId}`);
}
