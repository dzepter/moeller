import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { PageHeader, Table, Th, Td, TrLink, Badge, EmptyState } from "@/components/admin/ui";
import { formatDateTime, cn } from "@/lib/utils";
import type { ChatStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Chats" };

const STATUS_LABEL: Record<ChatStatus, string> = { OFFEN: "Offen", BEANTWORTET: "Beantwortet", ERLEDIGT: "Erledigt" };
const STATUS_TONE: Record<ChatStatus, "yellow" | "blue" | "green"> = { OFFEN: "yellow", BEANTWORTET: "blue", ERLEDIGT: "green" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ChatsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("chat.manage");
  const params = await searchParams;
  const filter = typeof params.status === "string" ? params.status : "AKTIV";

  const where =
    filter === "OFFEN" || filter === "BEANTWORTET" || filter === "ERLEDIGT"
      ? { status: filter as ChatStatus }
      : filter === "UNGELESEN"
        ? { status: "OFFEN" as ChatStatus }
        : { status: { in: ["OFFEN", "BEANTWORTET"] as ChatStatus[] } };

  const conversations = await db.chatConversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      assignedUser: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const tabs = [
    { key: "AKTIV", label: "Aktiv" },
    { key: "OFFEN", label: "Offen / ungelesen" },
    { key: "BEANTWORTET", label: "Beantwortet" },
    { key: "ERLEDIGT", label: "Erledigt" },
  ];

  return (
    <>
      <PageHeader title="Live-Chat" description="Anfragen von der Website – echte Menschen, echte Antworten." />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/chats?status=${tab.key}`}
            className={cn(
              "rounded-[2px] border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              filter === tab.key ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {conversations.length ? (
        <Table
          head={
            <>
              <Th>Besucher</Th>
              <Th>Letzte Nachricht</Th>
              <Th>Status</Th>
              <Th>Zugewiesen</Th>
              <Th>Aktualisiert</Th>
            </>
          }
        >
          {conversations.map((c) => {
            const unread = !c.lastAgentReadAt || c.lastAgentReadAt < c.lastMessageAt;
            return (
              <TrLink key={c.id} className={unread ? "bg-warn-wash/60" : undefined}>
                <Td className="font-semibold text-ink">
                  <Link href={`/admin/chats/${c.id}`} className="hover:text-brand">
                    {unread ? <span aria-label="ungelesen" className="mr-1.5 inline-block h-2 w-2 rounded-full bg-brand" /> : null}
                    {c.visitorName ?? "Anonymer Besucher"}
                    {c.startedOffline ? <Badge tone="neutral">außerhalb Bürozeit</Badge> : null}
                  </Link>
                </Td>
                <Td className="max-w-[22rem] truncate text-ink-mute">{c.messages[0]?.body ?? "–"}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                </Td>
                <Td>{c.assignedUser?.name ?? "–"}</Td>
                <Td className="whitespace-nowrap text-xs">{formatDateTime(c.lastMessageAt)}</Td>
              </TrLink>
            );
          })}
        </Table>
      ) : (
        <EmptyState title="Keine Chats in dieser Ansicht" hint="Neue Unterhaltungen erscheinen hier, sobald Besucher schreiben." />
      )}
    </>
  );
}
