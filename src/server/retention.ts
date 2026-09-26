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

/**
 * Phase 1 (reine DB-Transaktion): Bewerbung anonymisieren und zugehörige
 * Dateien nur MARKIEREN (pendingDeletionAt). DB und Dateisystem/S3 können
 * keine gemeinsame Transaktion bilden – deshalb wird hier nichts physisch
 * gelöscht: schlägt die Transaktion fehl, ist auch keine Datei weg.
 * Markierte Dateien gelten überall als gelöscht (Auslieferung gesperrt) und
 * werden in Phase 2 (deletePendingFiles) physisch entfernt – retryfähig.
 */
async function anonymizeApplication(applicationId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const app = await tx.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: { candidate: { include: { applications: true, files: true } } },
    });
    if (app.cvFileId) {
      await tx.privateFile.update({ where: { id: app.cvFileId }, data: { pendingDeletionAt: new Date() } });
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
      await tx.privateFile.updateMany({
        where: { candidateId: app.candidateId },
        data: { pendingDeletionAt: new Date() },
      });
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

/**
 * Phase 2: zur Löschung markierte Dateien physisch entfernen. Erst wenn das
 * Storage-Delete gelungen ist, verschwindet die DB-Zeile (Application.cvFileId
 * wird per onDelete: SetNull automatisch geleert). Schlägt das Löschen fehl,
 * bleibt die Zeile markiert und der nächste Lauf versucht es erneut – es kann
 * also nie ein dauerhafter Verweis auf eine verschwundene Datei entstehen.
 */
export async function deletePendingFiles(): Promise<{ deleted: number; failed: number }> {
  const pending = await db.privateFile.findMany({
    where: { pendingDeletionAt: { not: null } },
    take: 500,
  });
  let deleted = 0;
  let failed = 0;
  for (const file of pending) {
    try {
      await storage.delete("private", file.fileName);
      await db.privateFile.delete({ where: { id: file.id } });
      deleted++;
    } catch (err) {
      failed++;
      console.error(
        `[retention] Datei ${file.id} konnte nicht gelöscht werden – bleibt markiert und wird beim nächsten Lauf erneut versucht.`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return { deleted, failed };
}

export async function runRetention(actorId?: string): Promise<Record<string, number>> {
  const preview = await retentionPreview();
  const { rejectedDays, completedDays, chatDays, referralDays } = preview.settings;
  let applications = 0;
  let chats = 0;
  let referrals = 0;

  // Zuerst liegengebliebene Datei-Löschungen aus früheren Läufen nachholen
  const retriedFiles = await deletePendingFiles();

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

  // Frisch markierte Dateien physisch löschen (Fehler bleiben markiert → Retry)
  const files = await deletePendingFiles();

  // Abgelaufene Rate-Limit-Buckets und alte E-Mail-Logs bereinigen
  const rlHours = await getSetting("retention.rateLimitHours");
  const rl = await db.rateLimitBucket.deleteMany({ where: { updatedAt: { lt: cutoff(rlHours / 24) } } });
  const mails = await db.emailLog.deleteMany({ where: { createdAt: { lt: cutoff(365) } } });

  const filesDeleted = retriedFiles.deleted + files.deleted;
  const filesFailed = files.failed;
  if (applications + chats + referrals + filesDeleted > 0 || filesFailed > 0) {
    await audit({
      action: "retention.executed",
      actorId,
      actorType: actorId ? "USER" : "SYSTEM",
      meta: { applications, chats, referrals, filesDeleted, filesFailed, rateLimitBuckets: rl.count, emailLogs: mails.count },
    });
  }
  return { applications, chats, referrals };
}
