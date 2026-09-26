import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSetting } from "@/lib/settings";
import { storage } from "@/lib/storage";

/**
 * Retention-Engine: anonymisiert/löscht personenbezogene Daten nach den im
 * Admin konfigurierten Fristen. Der Löschvorgang wird protokolliert, ohne die
 * gelöschten Inhalte selbst weiter aufzubewahren (nur Zähler/IDs).
 */

const ANON = "entfernt";

function cutoff(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Vorschau: was steht zur Löschung an? */
export async function retentionPreview() {
  const [rejectedDays, completedDays, chatDays, referralDays] = await Promise.all([
    getSetting("retention.rejectedApplicationsDays"),
    getSetting("retention.completedApplicationsDays"),
    getSetting("retention.chatDays"),
    getSetting("retention.referralDays"),
  ]);
  const [rejected, completed, chats, referrals] = await Promise.all([
    db.application.count({
      where: { manualStatus: "ABSAGE", statusChangedAt: { lt: cutoff(rejectedDays) }, anonymizedAt: null },
    }),
    db.application.count({
      where: { manualStatus: "ZUSAGE", statusChangedAt: { lt: cutoff(completedDays) }, anonymizedAt: null },
    }),
    db.chatConversation.count({
      where: { lastMessageAt: { lt: cutoff(chatDays) }, anonymizedAt: null },
    }),
    db.referral.count({
      where: {
        createdAt: { lt: cutoff(referralDays) },
        anonymizedAt: null,
        status: { in: ["KEIN_INTERESSE", "IN_BEWERBUNG_UEBERNOMMEN"] },
      },
    }),
  ]);
  return { rejected, completed, chats, referrals, settings: { rejectedDays, completedDays, chatDays, referralDays } };
}

async function anonymizeApplication(applicationId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const app = await tx.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: { candidate: { include: { applications: true, files: true } } },
    });
    // Datei(en) der Bewerbung löschen
    if (app.cvFileId) {
      const file = await tx.privateFile.findUnique({ where: { id: app.cvFileId } });
      if (file) {
        await storage.delete("private", file.fileName);
        await tx.privateFile.delete({ where: { id: file.id } });
      }
    }
    await tx.application.update({
      where: { id: app.id },
      data: { previousActivity: ANON, message: null, anonymizedAt: new Date() },
    });
    await tx.candidateNote.deleteMany({ where: { applicationId: app.id } });
    await tx.reminder.deleteMany({ where: { applicationId: app.id } });

    // Kandidat vollständig anonymisieren, wenn ALLE Bewerbungen anonymisiert sind
    const remaining = await tx.application.count({
      where: { candidateId: app.candidateId, anonymizedAt: null, id: { not: app.id } },
    });
    if (remaining === 0) {
      for (const f of app.candidate.files) {
        await storage.delete("private", f.fileName);
      }
      await tx.privateFile.deleteMany({ where: { candidateId: app.candidateId } });
      await tx.candidateNote.deleteMany({ where: { candidateId: app.candidateId } });
      await tx.candidate.update({
        where: { id: app.candidateId },
        data: {
          firstName: ANON,
          lastName: ANON,
          email: `anonymisiert-${app.candidateId}@invalid.local`,
          emailNormalized: `anonymisiert-${app.candidateId}@invalid.local`,
          phone: ANON,
          phoneNormalized: `anon-${app.candidateId}`,
          city: ANON,
          anonymizedAt: new Date(),
        },
      });
    }
  });
}

export async function runRetention(actorId?: string): Promise<Record<string, number>> {
  const preview = await retentionPreview();
  const { rejectedDays, completedDays, chatDays, referralDays } = preview.settings;
  let applications = 0;
  let chats = 0;
  let referrals = 0;

  const dueApps = await db.application.findMany({
    where: {
      anonymizedAt: null,
      OR: [
        { manualStatus: "ABSAGE", statusChangedAt: { lt: cutoff(rejectedDays) } },
        { manualStatus: "ZUSAGE", statusChangedAt: { lt: cutoff(completedDays) } },
      ],
    },
    select: { id: true },
    take: 200,
  });
  for (const a of dueApps) {
    await anonymizeApplication(a.id);
    applications++;
  }

  const dueChats = await db.chatConversation.findMany({
    where: { lastMessageAt: { lt: cutoff(chatDays) }, anonymizedAt: null },
    select: { id: true },
    take: 500,
  });
  for (const c of dueChats) {
    await db.$transaction([
      db.chatMessage.deleteMany({ where: { conversationId: c.id } }),
      db.chatConversation.update({
        where: { id: c.id },
        data: { visitorName: null, visitorEmail: null, visitorPhone: null, internalNote: null, anonymizedAt: new Date() },
      }),
    ]);
    chats++;
  }

  const dueReferrals = await db.referral.updateMany({
    where: {
      createdAt: { lt: cutoff(referralDays) },
      anonymizedAt: null,
      status: { in: ["KEIN_INTERESSE", "IN_BEWERBUNG_UEBERNOMMEN"] },
    },
    data: {
      referrerEmail: null,
      referrerPhone: null,
      referredFirstName: ANON,
      referredLastName: ANON,
      referredEmail: null,
      referredPhone: null,
      referredCity: null,
      note: null,
      anonymizedAt: new Date(),
    },
  });
  referrals = dueReferrals.count;

  // Abgelaufene Rate-Limit-Buckets und alte E-Mail-Logs bereinigen
  const rlHours = await getSetting("retention.rateLimitHours");
  const rl = await db.rateLimitBucket.deleteMany({ where: { updatedAt: { lt: cutoff(rlHours / 24) } } });
  const mails = await db.emailLog.deleteMany({ where: { createdAt: { lt: cutoff(365) } } });

  if (applications + chats + referrals > 0) {
    await audit({
      action: "retention.executed",
      actorId,
      actorType: actorId ? "USER" : "SYSTEM",
      meta: { applications, chats, referrals, rateLimitBuckets: rl.count, emailLogs: mails.count },
    });
  }
  return { applications, chats, referrals };
}
