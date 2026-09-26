import { db } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/crypto";
import { getSetting } from "@/lib/settings";
import { sendMail } from "@/lib/email";
import { tplAcademyErinnerung } from "@/lib/email/templates";
import { env } from "@/lib/env";

/**
 * Academy-Erinnerungen (konfigurierbar, Default aus):
 * - nach X Tagen ohne Start
 * - nach Y Tagen ohne Abschluss
 * TrainingReminderLog verhindert wiederholten Versand (kein Spam).
 */
export async function runAcademyReminders(now = new Date()): Promise<{ sent: number }> {
  const enabled = await getSetting("academy.reminders.enabled");
  if (!enabled) return { sent: 0 };
  const notStartedDays = await getSetting("academy.reminders.notStartedAfterDays");
  const notCompletedDays = await getSetting("academy.reminders.notCompletedAfterDays");
  let sent = 0;

  const candidates = await db.trainingAssignment.findMany({
    where: {
      status: { in: ["EINGELADEN", "BEGONNEN", "IN_BEARBEITUNG"] },
      invitedAt: { not: null },
      candidate: { anonymizedAt: null },
    },
    include: {
      candidate: true,
      courseVersion: { include: { course: true } },
      // Nicht widerrufene Einladungen zählen – auch abgelaufene: gerade dann
      // ist eine Erinnerung mit frischem Link sinnvoll. Hat der Innendienst
      // alle Einladungen widerrufen, ist der Zugang bewusst entzogen → keine Erinnerung.
      invitations: { where: { revokedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
      reminderLogs: true,
    },
    take: 200,
  });

  for (const a of candidates) {
    const invitation = a.invitations[0];
    if (!invitation || !a.invitedAt) continue;
    const daysSinceInvite = (now.getTime() - a.invitedAt.getTime()) / 86_400_000;
    const kind =
      a.status === "EINGELADEN" && daysSinceInvite >= notStartedDays
        ? "NICHT_GESTARTET"
        : a.status !== "EINGELADEN" && daysSinceInvite >= notCompletedDays
          ? "NICHT_ABGESCHLOSSEN"
          : null;
    if (!kind) continue;
    if (a.reminderLogs.some((r) => r.kind === kind)) continue;

    const email = a.candidate.email;
    if (!email || email.endsWith("@invalid.local")) continue;

    // Frischer Magic-Link für die Erinnerung (Token wird nur gehasht gespeichert).
    // Die bestehende Einladung bleibt gültig – wer die alte E-Mail nutzt, kommt weiter rein.
    const validityDays = await getSetting("academy.invitationValidityDays");
    const token = generateToken();
    await db.trainingInvitation.create({
      data: {
        assignmentId: a.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + validityDays * 86_400_000),
        sentAt: new Date(),
      },
    });

    const mail = tplAcademyErinnerung({
      firstName: a.candidate.firstName,
      courseTitle: a.courseVersion.course.title,
      link: `${env.baseUrl}/academy/${token}`,
      contact: {
        hoursLabel: (await getSetting("contact.openingHours")).label,
        phone: await getSetting("contact.phone"),
      },
    });
    await sendMail({
      to: email,
      subject: mail.subject,
      text: mail.text,
      template: "academy-erinnerung",
      relatedType: "TrainingAssignment",
      relatedId: a.id,
    });
    await db.trainingReminderLog.create({ data: { assignmentId: a.id, kind } });
    sent++;
  }
  return { sent };
}
