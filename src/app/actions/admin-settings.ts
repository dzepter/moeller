"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/rbac";
import { setSetting, type SettingDefs } from "@/lib/settings";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/app/actions/admin-candidates";

function emails(raw: string): string[] {
  return raw
    .split(/[\n,;]/)
    .map((e) => e.trim())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
    .slice(0, 10);
}

export async function saveSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "settings.manage")) return { error: "Keine Berechtigung." };
  const section = String(formData.get("section") ?? "");
  const s = (k: string) => String(formData.get(k) ?? "").trim();

  try {
    if (section === "kontakt") {
      await setSetting("contact.phone", s("phone"), user.id);
      await setSetting("contact.email", s("email"), user.id);
      await setSetting("contact.applicationEmail", s("applicationEmail"), user.id);
      await setSetting("contact.whatsappNumber", s("whatsappNumber").replace(/\D/g, ""), user.id);
      await setSetting(
        "contact.address",
        { company: s("company"), street: s("street"), zip: s("zip"), city: s("city") },
        user.id,
      );
      const from = s("hoursFrom") || "08:00";
      const to = s("hoursTo") || "17:00";
      const hours: SettingDefs["contact.openingHours"] = {
        days: [1, 2, 3, 4, 5],
        windows: [{ from, to }],
        label: s("hoursLabel") || `Montag bis Freitag, ${from}–${to} Uhr`,
      };
      await setSetting("contact.openingHours", hours, user.id);
    } else if (section === "whatsapp") {
      await setSetting("whatsapp.text.bewerber", s("textBewerber"), user.id);
      await setSetting("whatsapp.text.unternehmen", s("textUnternehmen"), user.id);
      await setSetting("whatsapp.text.allgemein", s("textAllgemein"), user.id);
    } else if (section === "benachrichtigungen") {
      await setSetting("notifications.applicationRecipients", emails(s("applicationRecipients")), user.id);
      await setSetting("notifications.referralRecipients", emails(s("referralRecipients")), user.id);
      await setSetting("notifications.chatRecipients", emails(s("chatRecipients")), user.id);
      await setSetting("chat.reNotifyAfterMinutes", Math.max(5, Number(s("reNotify")) || 30), user.id);
    } else if (section === "features") {
      await setSetting("features.teamSection", formData.get("teamSection") === "on", user.id);
      await setSetting("features.referencesPage", formData.get("referencesPage") === "on", user.id);
      await setSetting("features.faqPage", formData.get("faqPage") === "on", user.id);
      await setSetting("features.referralIncentives", formData.get("referralIncentives") === "on", user.id);
      await setSetting("features.analytics", formData.get("analytics") === "on", user.id);
      await setSetting("security.mfaRequiredForAdmins", formData.get("mfaRequired") === "on", user.id);
    } else if (section === "academy") {
      await setSetting("academy.invitationValidityDays", Math.max(1, Number(s("validityDays")) || 30), user.id);
      await setSetting("academy.passScorePct", Math.min(100, Math.max(1, Number(s("passScore")) || 80)), user.id);
      await setSetting("academy.reminders.enabled", formData.get("remindersEnabled") === "on", user.id);
      await setSetting("academy.reminders.notStartedAfterDays", Math.max(1, Number(s("notStarted")) || 7), user.id);
      await setSetting("academy.reminders.notCompletedAfterDays", Math.max(1, Number(s("notCompleted")) || 14), user.id);
    } else if (section === "consent") {
      await setSetting("applications.consentVersion", s("appVersion") || "v1", user.id);
      await setSetting("applications.consentText", s("appText"), user.id);
      await setSetting("referrals.consentVersion", s("refVersion") || "v1", user.id);
      await setSetting("referrals.consentText", s("refText"), user.id);
    } else if (section === "retention") {
      await setSetting("retention.rejectedApplicationsDays", Math.max(1, Number(s("rejected")) || 180), user.id);
      await setSetting("retention.completedApplicationsDays", Math.max(1, Number(s("completed")) || 730), user.id);
      await setSetting("retention.chatDays", Math.max(1, Number(s("chat")) || 180), user.id);
      await setSetting("retention.referralDays", Math.max(1, Number(s("referral")) || 365), user.id);
    } else {
      return { error: "Unbekannter Bereich." };
    }
    await audit({ action: "settings.updated", actorId: user.id, meta: { section } });
    revalidatePath("/admin/einstellungen");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error && err.message.length < 250 ? err.message : "Speichern fehlgeschlagen." };
  }
}

// ---------- Team-Mitglieder (öffentlicher Team-Bereich) ----------

export async function saveTeamMemberAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "settings.manage")) return { error: "Keine Berechtigung." };
  const id = String(formData.get("id") ?? "");
  const data = {
    name: String(formData.get("name") ?? "").trim().slice(0, 120),
    role: String(formData.get("role") ?? "").trim().slice(0, 120),
    bio: String(formData.get("bio") ?? "").trim().slice(0, 500) || null,
    active: formData.get("active") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  };
  if (!data.name || !data.role) return { error: "Name und Funktion sind Pflicht." };
  if (id) {
    await db.teamMember.update({ where: { id }, data });
  } else {
    await db.teamMember.create({ data });
  }
  revalidatePath("/admin/einstellungen");
  revalidatePath("/ueber-uns");
  return { ok: true };
}

export async function deleteTeamMemberAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "settings.manage")) return;
  const id = String(formData.get("id") ?? "");
  if (id) await db.teamMember.delete({ where: { id } }).catch(() => undefined);
  revalidatePath("/admin/einstellungen");
  revalidatePath("/ueber-uns");
}
