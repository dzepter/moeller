import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { chatMarkReadAction, chatStatusAction, chatAssignAction, chatNoteAction } from "@/app/actions/admin-chat";
import { PageHeader, Card, Badge, inputCls, Label } from "@/components/admin/ui";
import { ChatThread } from "@/components/admin/chat-thread";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("chat.manage");
  const { id } = await params;
  const conversation = await db.chatConversation.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 500, include: { senderUser: { select: { name: true } } } },
      assignedUser: { select: { id: true, name: true } },
    },
  });
  if (!conversation) notFound();
  await chatMarkReadAction(conversation.id);

  const users = await db.user.findMany({
    where: { active: true, roles: { some: { role: { key: { in: ["ADMINISTRATOR", "INNENDIENST"] } } } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <div className="mb-4 text-sm">
        <Link href="/admin/chats" className="prose-link">
          ← Zurück zur Übersicht
        </Link>
      </div>
      <PageHeader
        title={conversation.visitorName ?? "Anonymer Besucher"}
        description={`Gestartet ${formatDateTime(conversation.createdAt)}${conversation.startedOffline ? " · außerhalb der Bürozeiten" : ""}`}
        actions={
          <Badge tone={conversation.status === "ERLEDIGT" ? "green" : conversation.status === "BEANTWORTET" ? "blue" : "yellow"}>
            {conversation.status === "ERLEDIGT" ? "Erledigt" : conversation.status === "BEANTWORTET" ? "Beantwortet" : "Offen"}
          </Badge>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <ChatThread
          conversationId={conversation.id}
          initialMessages={conversation.messages.map((m) => ({
            id: m.id,
            sender: m.sender,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
            senderName: m.senderUser?.name ?? null,
          }))}
        />

        <div className="space-y-5">
          <Card title="Besucher">
            <dl className="space-y-2.5 text-[0.95rem]">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Name</dt>
                <dd>{conversation.visitorName ?? "–"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">E-Mail</dt>
                <dd>{conversation.visitorEmail ? <a href={`mailto:${conversation.visitorEmail}`} className="prose-link">{conversation.visitorEmail}</a> : "–"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Telefon</dt>
                <dd>{conversation.visitorPhone ?? "–"}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Bearbeitung">
            <form action={chatAssignAction} className="space-y-2">
              <input type="hidden" name="conversationId" value={conversation.id} />
              <Label htmlFor="ch-assign">Zugewiesen an</Label>
              <div className="flex gap-2">
                <select id="ch-assign" name="userId" defaultValue={conversation.assignedUser?.id ?? ""} className={inputCls}>
                  <option value="">– niemand –</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className="whitespace-nowrap rounded-[2px] bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-deep">
                  OK
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {conversation.status !== "ERLEDIGT" ? (
                <form action={chatStatusAction}>
                  <input type="hidden" name="conversationId" value={conversation.id} />
                  <input type="hidden" name="status" value="ERLEDIGT" />
                  <button type="submit" className="rounded-[2px] border-[1.5px] border-ink px-3 py-1.5 text-sm font-semibold text-ink hover:bg-ink hover:text-white">
                    Als erledigt schließen
                  </button>
                </form>
              ) : (
                <form action={chatStatusAction}>
                  <input type="hidden" name="conversationId" value={conversation.id} />
                  <input type="hidden" name="status" value="OFFEN" />
                  <button type="submit" className="rounded-[2px] border-[1.5px] border-ink px-3 py-1.5 text-sm font-semibold text-ink hover:bg-ink hover:text-white">
                    Wieder öffnen
                  </button>
                </form>
              )}
            </div>
          </Card>

          <Card title="Interne Notiz">
            <form action={chatNoteAction} className="space-y-2">
              <input type="hidden" name="conversationId" value={conversation.id} />
              <textarea name="note" rows={4} maxLength={2000} defaultValue={conversation.internalNote ?? ""} className={inputCls} placeholder="Nur intern sichtbar" />
              <button type="submit" className="rounded-[2px] bg-brand px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-deep">
                Notiz speichern
              </button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
