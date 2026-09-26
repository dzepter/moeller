"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/rbac";
import { realtimeHub } from "@/lib/realtime";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/app/actions/admin-candidates";

const replySchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, "Bitte eine Nachricht eingeben.").max(2000),
});

export async function chatReplyAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "chat.manage")) return { error: "Keine Berechtigung." };
  const parsed = replySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Bitte eine Nachricht eingeben." };

  const conversation = await db.chatConversation.findUnique({ where: { id: parsed.data.conversationId } });
  if (!conversation) return { error: "Unterhaltung nicht gefunden." };

  const message = await db.chatMessage.create({
    data: {
      conversationId: conversation.id,
      sender: "TEAM",
      senderUserId: user.id,
      body: parsed.data.body,
    },
  });
  await db.chatConversation.update({
    where: { id: conversation.id },
    data: {
      status: "BEANTWORTET",
      lastMessageAt: new Date(),
      lastAgentReadAt: new Date(),
      assignedUserId: conversation.assignedUserId ?? user.id,
    },
  });
  realtimeHub.publish(`chat:${conversation.id}`, {
    type: "message",
    payload: { id: message.id, sender: "TEAM", body: message.body, createdAt: message.createdAt.toISOString() },
  });
  realtimeHub.publish("chat:inbox", { type: "update", payload: { conversationId: conversation.id } });
  revalidatePath(`/admin/chats/${conversation.id}`);
  return { ok: true };
}

const statusSchema = z.object({
  conversationId: z.string().min(1),
  status: z.enum(["OFFEN", "BEANTWORTET", "ERLEDIGT"]),
});

export async function chatStatusAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "chat.manage")) return;
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await db.chatConversation.update({
    where: { id: parsed.data.conversationId },
    data: {
      status: parsed.data.status,
      closedAt: parsed.data.status === "ERLEDIGT" ? new Date() : null,
    },
  });
  await audit({
    action: "chat.status.changed",
    actorId: user.id,
    entityType: "ChatConversation",
    entityId: parsed.data.conversationId,
    meta: { to: parsed.data.status },
  });
  revalidatePath("/admin/chats");
  revalidatePath(`/admin/chats/${parsed.data.conversationId}`);
}

export async function chatAssignAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "chat.manage")) return;
  const conversationId = String(formData.get("conversationId") ?? "");
  const userId = String(formData.get("userId") ?? "") || null;
  if (!conversationId) return;
  await db.chatConversation.update({ where: { id: conversationId }, data: { assignedUserId: userId } });
  if (userId) {
    await db.chatAssignment.create({ data: { conversationId, userId, assignedById: user.id } });
    await audit({ action: "chat.assigned", actorId: user.id, entityType: "ChatConversation", entityId: conversationId, meta: { to: userId } });
  }
  revalidatePath(`/admin/chats/${conversationId}`);
}

export async function chatNoteAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "chat.manage")) return;
  const conversationId = String(formData.get("conversationId") ?? "");
  const note = String(formData.get("note") ?? "").slice(0, 2000);
  if (!conversationId) return;
  await db.chatConversation.update({ where: { id: conversationId }, data: { internalNote: note || null } });
  revalidatePath(`/admin/chats/${conversationId}`);
}

export async function chatMarkReadAction(conversationId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "chat.manage")) return;
  await db.chatConversation.update({ where: { id: conversationId }, data: { lastAgentReadAt: new Date() } });
}
