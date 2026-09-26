import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, hasPermission, applicationScope } from "@/lib/rbac";
import { PageHeader, StatCard, Card, Badge, EmptyState } from "@/components/admin/ui";
import { formatDate, formatDateTime, BUNDESLAND_KURZ } from "@/lib/utils";
import { statusLabel, statusTone } from "@/components/admin/status";

export default async function AdminDashboard() {
  const user = await requireUser();
  const scope = await applicationScope(user);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

  const canChat = hasPermission(user, "chat.manage");
  const canReferrals = hasPermission(user, "referrals.manage");
  const canJobs = hasPermission(user, "jobs.manage");

  const [
    newApplications,
    openApplications,
    remindersToday,
    remindersOverdue,
    upcomingTalks,
    upcomingTrials,
    newReferrals,
    unreadChats,
    openJobs,
    activeDelegations,
    latestApplications,
    myReminders,
  ] = await Promise.all([
    db.application.count({ where: { ...scope, autoStatus: "NEU", manualStatus: null, anonymizedAt: null } }),
    db.application.count({ where: { ...scope, autoStatus: "OFFEN", manualStatus: null, anonymizedAt: null } }),
    db.reminder.count({ where: { done: false, dueDate: { gte: startOfDay, lt: endOfDay }, application: scope } }),
    db.reminder.count({ where: { done: false, dueDate: { lt: startOfDay }, application: scope } }),
    db.application.count({
      where: { ...scope, manualStatus: { in: ["INTERESSENTENGESPRAECH_VEREINBART", "VERTRAGSGESPRAECH_VEREINBART"] } },
    }),
    db.application.count({ where: { ...scope, manualStatus: "SCHNUPPERTAG_VEREINBART" } }),
    canReferrals ? db.referral.count({ where: { status: { in: ["EMPFEHLUNG_NEU", "KONTAKT_AUSSTEHEND"] } } }) : Promise.resolve(0),
    canChat
      ? db.chatConversation.count({ where: { status: "OFFEN" } })
      : Promise.resolve(0),
    canJobs ? db.job.count({ where: { status: "VEROEFFENTLICHT" } }) : Promise.resolve(0),
    db.teamLeadDelegation.count({ where: { cancelledAt: null, startsAt: { lte: now }, endsAt: { gte: now } } }),
    db.application.findMany({
      where: { ...scope, anonymizedAt: null },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { candidate: true, job: { select: { title: true } } },
    }),
    db.reminder.findMany({
      where: { assigneeId: user.id, done: false, dueDate: { lt: endOfDay } },
      orderBy: { dueDate: "asc" },
      take: 6,
      include: { candidate: { select: { firstName: true, lastName: true } }, application: { select: { id: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title={`Guten Tag, ${user.name.split(" ")[0]}!`}
        description="Deine Arbeitszentrale – alles Wichtige auf einen Blick."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Neue Bewerbungen" value={newApplications} href="/admin/bewerbungen?status=NEU" />
        <StatCard label="Offene Bewerbungen" value={openApplications} href="/admin/bewerbungen?status=OFFEN" />
        <StatCard label="Wiedervorlagen heute" value={remindersToday} href="/admin/wiedervorlagen" />
        <StatCard label="Überfällige Wiedervorlagen" value={remindersOverdue} href="/admin/wiedervorlagen?filter=ueberfaellig" tone="alert" />
        <StatCard label="Anstehende Gespräche" value={upcomingTalks} href="/admin/bewerbungen?status=GESPRAECH" />
        <StatCard label="Schnuppertage vereinbart" value={upcomingTrials} href="/admin/bewerbungen?status=SCHNUPPERTAG_VEREINBART" />
        {canReferrals ? <StatCard label="Neue Empfehlungen" value={newReferrals} href="/admin/empfehlungen" /> : null}
        {canChat ? <StatCard label="Offene Chats" value={unreadChats} href="/admin/chats" tone="alert" /> : null}
        {canJobs ? <StatCard label="Veröffentlichte Stellen" value={openJobs} href="/admin/stellen" /> : null}
        <StatCard label="Aktive Vertretungen" value={activeDelegations} href="/admin/vertretungen" />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Zuletzt eingegangene Bewerbungen">
          {latestApplications.length ? (
            <ul className="divide-y divide-line-soft">
              {latestApplications.map((app) => (
                <li key={app.id}>
                  <Link href={`/admin/bewerbungen/${app.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 hover:bg-brand-wash/40 md:px-2 md:-mx-2">
                    <span>
                      <span className="font-semibold text-ink">
                        {app.candidate.firstName} {app.candidate.lastName}
                      </span>{" "}
                      <span className="text-ink-mute">
                        · {app.job?.title ?? "Initiativbewerbung"} · {BUNDESLAND_KURZ[app.bundesland]}
                      </span>
                    </span>
                    <span className="flex items-center gap-2.5">
                      <Badge tone={statusTone(app)}>{statusLabel(app)}</Badge>
                      <span className="text-xs text-ink-mute">{formatDate(app.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Noch keine Bewerbungen in Deinem Bereich" hint="Sobald Bewerbungen eingehen, erscheinen sie hier." />
          )}
        </Card>

        <Card title="Deine fälligen Wiedervorlagen">
          {myReminders.length ? (
            <ul className="divide-y divide-line-soft">
              {myReminders.map((reminder) => (
                <li key={reminder.id} className="py-2.5">
                  <Link
                    href={reminder.application ? `/admin/bewerbungen/${reminder.application.id}` : "/admin/wiedervorlagen"}
                    className="block hover:text-brand"
                  >
                    <p className="font-semibold text-ink">{reminder.subject}</p>
                    <p className="mt-0.5 text-xs text-ink-mute">
                      {reminder.candidate ? `${reminder.candidate.firstName} ${reminder.candidate.lastName} · ` : ""}
                      fällig {formatDateTime(reminder.dueDate).split(",")[0]}
                      {reminder.dueTime ? `, ${reminder.dueTime} Uhr` : ""}
                      {reminder.dueDate < new Date(new Date().setHours(0, 0, 0, 0)) ? " · überfällig" : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nichts fällig – sehr gut!" hint="Neue Wiedervorlagen legst Du direkt am Bewerber an." />
          )}
        </Card>
      </div>
    </>
  );
}
