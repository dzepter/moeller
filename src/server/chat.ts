import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { realtimeHub } from "@/lib/realtime";
import { sendMail } from "@/lib/email";
import { tplNeuerChatIntern } from "@/lib/email/templates";
import { getSetting, isWithinBusinessHours } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { track } from "@/lib/analytics";

/**
 * Live-Chat: Besucher-Seite. Kein Bot – Nachrichten landen beim Innendienst.
 * Identifikation der Besucher über ein httpOnly-Cookie-Token (nur Hash in DB).
 */

const MAX_MESSAGE_LEN = 2000;

export async function getVisitorConversation(visitorToken: string) {
  return db.chatConversation.findUnique({
    where: { visitorTokenHash: hashToken(visitorToken) },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } },
  });
}

export async function startOrPostMessage(params: {
  visitorToken: string;
  body: string;
  name?: string;
  email?: string;
  phone?: string;
  topic?: string;
}) {
  const body = params.body.trim().slice(0, MAX_MESSAGE_LEN);
  if (!body) throw new Error("Leere Nachricht");
  const tokenHash = hashToken(params.visitorToken);

  let conversation = await db.chatConversation.findUnique({ where: { visitorTokenHash: tokenHash } });
  const isNew = !conversation || conversation.status === "ERLEDIGT";
  const offline = !(await isWithinBusinessHours());

  if (!conversation) {
    conversation = await db.chatConversation.create({
      data: {
        visitorTokenHash: tokenHash,
        visitorName: params.name?.trim().slice(0, 120) || null,
        visitorEmail: params.email?.trim().slice(0, 200) || null,
        visitorPhone: params.phone?.trim().slice(0, 50) || null,
        topic: params.topic?.slice(0, 60) || null,
        startedOffline: offline,
      },
    });
    await audit({ action: "chat.started", actorType: "VISITOR", entityType: "ChatConversation", entityId: conversation.id });
    await track("chat_gestartet");
  } else {
    // Kontaktdaten ergänzen, falls nachgereicht; erledigte Unterhaltung wieder öffnen
    await db.chatConversation.update({
      where: { id: conversation.id },
      data: {
        visitorName: conversation.visitorName ?? (params.name?.trim().slice(0, 120) || null),
        visitorEmail: conversation.visitorEmail ?? (params.email?.trim().slice(0, 200) || null),
        visitorPhone: conversation.visitorPhone ?? (params.phone?.trim().slice(0, 50) || null),
        status: conversation.status === "ERLEDIGT" ? "OFFEN" : conversation.status,
        closedAt: conversation.status === "ERLEDIGT" ? null : conversation.closedAt,
      },
    });
  }

  const message = await db.chatMessage.create({
    data: { conversationId: conversation.id, sender: "BESUCHER", body },
  });
  await db.chatConversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), status: conversation.status === "BEANTWORTET" ? "OFFEN" : undefined },
  });

  realtimeHub.publish(`chat:${conversation.id}`, {
    type: "message",
    payload: { id: message.id, sender: "BESUCHER", body, createdAt: message.createdAt.toISOString() },
  });
  realtimeHub.publish("chat:inbox", { type: "update", payload: { conversationId: conversation.id } });

  // E-Mail-Benachrichtigung: bei neuer Unterhaltung oder Reaktivierung ohne Reaktion
  const reNotifyMinutes = await getSetting("chat.reNotifyAfterMinutes");
  const lastNotified = conversation.emailNotifiedAt?.getTime() ?? 0;
  const agentReacted = conversation.lastAgentReadAt && conversation.lastAgentReadAt.getTime() > lastNotified;
  const pauseOver = Date.now() - lastNotified > reNotifyMinutes * 60 * 1000;
  if (isNew || (!agentReacted && pauseOver)) {
    const recipients = await getSetting("notifications.chatRecipients");
    const mail = tplNeuerChatIntern({ conversationId: conversation.id, topic: conversation.topic });
    for (const to of recipients) {
      await sendMail({ to, subject: mail.subject, text: mail.text, template: "chat-intern", relatedType: "ChatConversation", relatedId: conversation.id });
    }
    await db.chatConversation.update({ where: { id: conversation.id }, data: { emailNotifiedAt: new Date() } });
  }

  return { conversationId: conversation.id, messageId: message.id, offline };
}
