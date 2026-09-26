"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/rbac";
import { createDelegation, cancelDelegation } from "@/server/delegations";
import type { ActionResult } from "@/app/actions/admin-candidates";

const schema = z.object({
  fromUserId: z.string().min(1, "Bitte die vertretene Person wählen."),
  toUserId: z.string().min(1, "Bitte die Vertretung wählen."),
  startsAt: z.string().min(8, "Bitte einen Beginn wählen."),
  endsAt: z.string().min(8, "Bitte ein Ende wählen."),
  reason: z.string().max(300).optional(),
});

export async function createDelegationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Nicht angemeldet");
    const data = schema.parse(Object.fromEntries(formData));
    // Datumsangaben ohne Uhrzeit: Beginn 00:00, Ende 23:59 des gewählten Tages
    const startsAt = new Date(data.startsAt.length <= 10 ? `${data.startsAt}T00:00:00` : data.startsAt);
    const endsAt = new Date(data.endsAt.length <= 10 ? `${data.endsAt}T23:59:59` : data.endsAt);
    await createDelegation(user, {
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      startsAt,
      endsAt,
      reason: data.reason,
    });
    revalidatePath("/admin/vertretungen");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error && err.message.length < 250 ? err.message : "Aktion fehlgeschlagen." };
  }
}

export async function cancelDelegationAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (id) {
    try {
      await cancelDelegation(user, id);
    } catch {
      /* UI zeigt Zustand nach Refresh */
    }
  }
  revalidatePath("/admin/vertretungen");
}
