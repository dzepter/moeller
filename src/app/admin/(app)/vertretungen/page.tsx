import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser, hasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { PageHeader, Card, Table, Th, Td, TrLink, Badge, EmptyState } from "@/components/admin/ui";
import { DelegationForm } from "@/components/admin/delegation-form";
import { cancelDelegationAction } from "@/app/actions/admin-delegations";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Vertretungen" };

export default async function VertretungenPage() {
  const user = await requireUser();
  const canManage = hasPermission(user, "delegations.manage");
  const canSelf = hasPermission(user, "delegations.self");
  if (!canManage && !canSelf) redirect("/admin");

  const now = new Date();
  const [delegations, teamleiter] = await Promise.all([
    db.teamLeadDelegation.findMany({
      orderBy: { startsAt: "desc" },
      take: 100,
      include: {
        fromUser: { select: { id: true, name: true, region: { select: { name: true } } } },
        toUser: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
      },
    }),
    db.user.findMany({
      where: { active: true, roles: { some: { role: { key: "TEAMLEITER" } } } },
      select: { id: true, name: true, region: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const visible = canManage ? delegations : delegations.filter((d) => d.fromUserId === user.id || d.toUserId === user.id);

  return (
    <>
      <PageHeader
        title="Teamleiter-Vertretungen"
        description="Während einer Vertretung sieht die Vertretung zusätzlich die Bewerber des vertretenen Gebiets. Rechte enden automatisch zum Endzeitpunkt."
      />

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div>
          {visible.length ? (
            <Table
              head={
                <>
                  <Th>Vertreten wird</Th>
                  <Th>Vertretung</Th>
                  <Th>Zeitraum</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </>
              }
            >
              {visible.map((d) => {
                const active = !d.cancelledAt && d.startsAt <= now && d.endsAt >= now;
                const upcoming = !d.cancelledAt && d.startsAt > now;
                const status = d.cancelledAt ? "beendet" : active ? "aktiv" : upcoming ? "geplant" : "abgelaufen";
                const canCancel = !d.cancelledAt && d.endsAt >= now && (canManage || d.fromUserId === user.id);
                return (
                  <TrLink key={d.id}>
                    <Td className="font-semibold text-ink">
                      {d.fromUser.name}
                      <span className="block text-xs font-normal text-ink-mute">{d.fromUser.region?.name ?? "ohne Region"}</span>
                    </Td>
                    <Td>{d.toUser.name}</Td>
                    <Td className="whitespace-nowrap">
                      {formatDate(d.startsAt)} – {formatDate(d.endsAt)}
                      {d.reason ? <span className="block text-xs text-ink-mute">{d.reason}</span> : null}
                    </Td>
                    <Td>
                      <Badge tone={active ? "green" : upcoming ? "blue" : "neutral"}>{status}</Badge>
                    </Td>
                    <Td className="text-right">
                      {canCancel ? (
                        <form action={cancelDelegationAction}>
                          <input type="hidden" name="id" value={d.id} />
                          <button type="submit" className="prose-link text-sm">
                            Vorzeitig beenden
                          </button>
                        </form>
                      ) : null}
                    </Td>
                  </TrLink>
                );
              })}
            </Table>
          ) : (
            <EmptyState title="Keine Vertretungen" hint="Lege rechts eine neue Vertretung an." />
          )}
        </div>

        <Card title="Neue Vertretung anlegen">
          <DelegationForm
            teamleiter={teamleiter.map((t) => ({ id: t.id, name: `${t.name}${t.region ? ` (${t.region.name})` : ""}` }))}
            selfId={user.id}
            canManage={canManage}
          />
        </Card>
      </div>
    </>
  );
}
