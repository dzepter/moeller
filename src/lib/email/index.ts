import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Providerunabhängiger E-Mail-Versand mit Zustellprotokoll (EmailLog) und Retry
 * über den Scheduler. Provider: "smtp" (nodemailer) oder "log" (Dev).
 */

export type OutgoingMail = {
  to: string;
  subject: string;
  text: string;
  template: string;
  relatedType?: string;
  relatedId?: string;
};

async function deliver(mail: { to: string; subject: string; text: string }): Promise<void> {
  if (env.email.provider === "log") {
    console.info(`[email:log] An: ${mail.to} | Betreff: ${mail.subject}\n${mail.text}`);
    return;
  }
  const smtp = env.email.smtp;
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
  });
  await transporter.sendMail({ from: env.email.from, to: mail.to, subject: mail.subject, text: mail.text });
}

/** Mail einreihen und sofort zu senden versuchen; Fehler landen im Retry. */
export async function sendMail(mail: OutgoingMail): Promise<void> {
  const log = await db.emailLog.create({
    data: {
      to: mail.to,
      subject: mail.subject,
      bodyText: mail.text,
      template: mail.template,
      relatedType: mail.relatedType,
      relatedId: mail.relatedId,
    },
  });
  try {
    await deliver(mail);
    await db.emailLog.update({
      where: { id: log.id },
      data: { status: "SENT", sentAt: new Date(), attempts: 1 },
    });
  } catch (err) {
    await db.emailLog.update({
      where: { id: log.id },
      data: { status: "FAILED", attempts: 1, lastError: err instanceof Error ? err.message.slice(0, 500) : "Unbekannter Fehler" },
    });
  }
}

/** Scheduler-Job: fehlgeschlagene Mails erneut versuchen (max. 5 Versuche). */
export async function retryFailedMails(): Promise<number> {
  const failed = await db.emailLog.findMany({
    where: { status: "FAILED", attempts: { lt: 5 } },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  let retried = 0;
  for (const mail of failed) {
    try {
      await deliver({ to: mail.to, subject: mail.subject, text: mail.bodyText });
      await db.emailLog.update({
        where: { id: mail.id },
        data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 } },
      });
      retried++;
    } catch (err) {
      await db.emailLog.update({
        where: { id: mail.id },
        data: {
          attempts: { increment: 1 },
          lastError: err instanceof Error ? err.message.slice(0, 500) : "Unbekannter Fehler",
        },
      });
    }
  }
  return retried;
}
