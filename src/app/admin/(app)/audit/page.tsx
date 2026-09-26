import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { PageHeader, Table, Th, Td, TrLink, inputCls } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit-Log" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("audit.view");
  const params = await searchParams;
  const action = typeof params.aktion === "string" && params.aktion ? params.aktion : undefined;
  const q = typeof params.q === "string" && params.q ? params.q : undefined;

  const entries = await db.auditLog.findMany({
    where: {
      ...(action ? { action: { startsWith: action } } : {}),
      ...(q ? { OR: [{ entityId: q }, { entityType: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true } } },
  });

  const actionGroups = ["auth", "user", "role", "application", "candidate", "note", "reminder", "delegation", "referral", "chat", "job", "cms", "media", "settings", "reporting", "retention", "academy", "system"];

  return (
    <>
      <PageHeader
        title="Audit-Log"
        description="Sicherheits- und datenschutzrelevante Ereignisse, unveränderlich protokolliert (append-only)."
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 border border-line bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Bereich</span>
          <select name="aktion" defaultValue={action ?? ""} className={inputCls}>
            <option value="">Alle</option>
            {actionGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Entity-ID / Typ</span>
          <input type="text" name="q" defaultValue={q ?? ""} className={inputCls} />
        </label>
        <Button type="submit" size="sm">
          Filtern
        </Button>
      </form>

      <Table
        head={
          <>
            <Th>Zeitpunkt</Th>
            <Th>Aktion</Th>
            <Th>Akteur</Th>
            <Th>Objekt</Th>
            <Th>Details</Th>
          </>
        }
      >
        {entries.map((entry) => (
          <TrLink key={entry.id}>
            <Td className="whitespace-nowrap text-xs">{formatDateTime(entry.createdAt)}</Td>
            <Td className="font-mono text-xs">{entry.action}</Td>
            <Td>{entry.actor?.name ?? entry.actorType}</Td>
            <Td className="text-xs text-ink-mute">
              {entry.entityType ?? "–"}
              {entry.entityId ? ` · ${entry.entityId.slice(0, 12)}…` : ""}
            </Td>
            <Td className="max-w-[20rem] truncate font-mono text-xs text-ink-mute">{JSON.stringify(entry.meta)}</Td>
          </TrLink>
        ))}
      </Table>
    </>
  );
}
