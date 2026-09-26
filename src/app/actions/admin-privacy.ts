"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/rbac";
import { runRetention, deletePendingFiles } from "@/server/retention";
import { audit } from "@/lib/audit";
import { normalizeEmail, normalizePhone } from "@/lib/utils";
import type { ActionResult } from "@/app/actions/admin-candidates";

export async function runRetentionAction(_prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "privacy.manage")) return { error: "Keine Berechtigung." };
  const result = await runRetention(user.id);
  revalidatePath("/admin/datenschutz");
  return {
    ok: true,
    error: undefined,
    ...({ info: `Anonymisiert: ${result.applications} Bewerbungen, ${result.chats} Chats, ${result.referrals} Empfehlungen.` } as object),
  };
}

export type SubjectResult = {
  candidates: Array<{ id: string; name: string; email: string; phone: string; city: string; applications: number; anonymized: boolean }>;
  referrals: Array<{ id: string; name: string; contact: string; status: string }>;
  chats: Array<{ id: string; name: string; contact: string }>;
} | null;

export async function subjectSearchAction(_prev: SubjectResult, formData: FormData): Promise<SubjectResult> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "privacy.manage")) return null;
  const q = String(formData.get("q") ?? "").trim();
  if (q.length < 3) return { candidates: [], referrals: [], chats: [] };

  const emailNorm = q.includes("@") ? normalizeEmail(q) : null;
  const phoneNorm = /\d{4,}/.test(q) ? normalizePhone(q) : null;

  const candidates = await db.candidate.findMany({
    where: {
      OR: [
        ...(emailNorm ? [{ emailNormalized: emailNorm }] : []),
        ...(phoneNorm ? [{ phoneNormalized: phoneNorm }] : []),
        { lastName: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
      ],
    },
    include: { _count: { select: { applications: true } } },
    take: 10,
  });
  const referrals = await db.referral.findMany({
    where: {
      OR: [
        { referredLastName: { contains: q, mode: "insensitive" } },
        { referredEmail: emailNorm ?? undefined },
        { referrerLastName: { contains: q, mode: "insensitive" } },
      ],
      anonymizedAt: null,
    },
    take: 10,
  });
  const chats = await db.chatConversation.findMany({
    where: {
      OR: [
        { visitorName: { contains: q, mode: "insensitive" } },
        { visitorEmail: emailNorm ?? undefined },
      ],
      anonymizedAt: null,
    },
    take: 10,
  });

  return {
    candidates: candidates.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      phone: c.phone,
      city: c.city,
      applications: c._count.applications,
      anonymized: Boolean(c.anonymizedAt),
    })),
    referrals: referrals.map((r) => ({
      id: r.id,
      name: r.referredFirstName ? `${r.referredFirstName} ${r.referredLastName}` : `(Empfehlung von ${r.referrerFirstName} ${r.referrerLastName})`,
      contact: r.referredEmail ?? r.referredPhone ?? "–",
      status: r.status,
    })),
    chats: chats.map((c) => ({ id: c.id, name: c.visitorName ?? "Anonym", contact: c.visitorEmail ?? c.visitorPhone ?? "–" })),
  };
}

/** Sofortige Anonymisierung einer Person (alle Bewerbungen, Notizen, Dateien). */
export async function anonymizeCandidateAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "privacy.manage")) return;
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!candidateId) return;

  const candidate = await db.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate || candidate.anonymizedAt) return;

  // Mark-then-Delete – dieselbe Strategie wie die automatische Retention:
  // Die DB-Transaktion anonymisiert und MARKIERT Dateien nur
  // (pendingDeletionAt); markierte Dateien werden nie ausgeliefert. Die
  // physische Löschung folgt danach retryfähig (deletePendingFiles) – schlägt
  // das Storage fehl, bleibt die Markierung stehen und der nächste
  // Retention-Lauf räumt auf. So kann nie eine DB-Referenz auf eine bereits
  // verschwundene Datei zurückbleiben.
  const ANON = "entfernt";
  await db.$transaction([
    db.privateFile.updateMany({ where: { candidateId }, data: { pendingDeletionAt: new Date() } }),
    db.candidateNote.deleteMany({ where: { candidateId } }),
    db.reminder.deleteMany({ where: { candidateId } }),
    db.application.updateMany({
      where: { candidateId },
      data: { previousActivity: ANON, message: null, anonymizedAt: new Date() },
    }),
    db.candidate.update({
      where: { id: candidateId },
      data: {
        firstName: ANON,
        lastName: ANON,
        email: `anonymisiert-${candidateId}@invalid.local`,
        emailNormalized: `anonymisiert-${candidateId}@invalid.local`,
        phone: ANON,
        phoneNormalized: `anon-${candidateId}`,
        city: ANON,
        anonymizedAt: new Date(),
      },
    }),
  ]);
  await audit({ action: "candidate.anonymized", actorId: user.id, entityType: "Candidate", entityId: candidateId });
  // Phase 2: physisch löschen; Fehler bleiben markiert (Retry im nächsten Lauf)
  await deletePendingFiles();
  revalidatePath("/admin/datenschutz");
}
