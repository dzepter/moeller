import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, hasPermission, applicationScope } from "@/lib/rbac";
import { PageHeader, Table, Th, Td, TrLink, Badge, EmptyState } from "@/components/admin/ui";
import { completeReminderAction } from "@/app/actions/admin-candidates";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Wiedervorlagen" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WiedervorlagenPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const filter = typeof params.filter === "string" ? params.filter : "offen";
  const scope = await applicationScope(user);
  const canSeeAll = hasPermission(user, "candidates.read.all");

  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

  const baseWhere = {
    done: false,
    // `is:` erzwingt die Relations-Semantik ("Bewerbung existiert und erfüllt
    // den Scope"): der uneingeschränkte Scope ist bei candidates.read.all ein
    // leeres Objekt, das Prisma als Kurzform-Filter ersatzlos entfernen würde –
    // dann bliebe nur der Zweig für bewerbungslose Wiedervorlagen übrig.
    OR: [{ application: { is: scope } }, { application: null, ...(canSeeAll ? {} : { assigneeId: user.id }) }],
  };

  const where =
    filter === "heute"
      ? { ...baseWhere, dueDate: { gte: startOfDay, lt: endOfDay } }
      : filter === "ueberfaellig"
        ? { ...baseWhere, dueDate: { lt: startOfDay } }
        : filter === "kommend"
          ? { ...baseWhere, dueDate: { gte: endOfDay } }
          : baseWhere;

  const reminders = await db.reminder.findMany({
    where,
    orderBy: { dueDate: "asc" },
    take: 200,
    include: {
      candidate: { select: { firstName: true, lastName: true } },
      application: { select: { id: true } },
      referral: { select: { id: true, referredFirstName: true, referredLastName: true } },
      assignee: { select: { name: true } },
    },
  });

  const tabs = [
    { key: "offen", label: "Alle offenen" },
    { key: "heute", label: "Heute fällig" },
    { key: "ueberfaellig", label: "Überfällig" },
    { key: "kommend", label: "Kommend" },
  ];

  return (
    <>
      <PageHeader title="Wiedervorlagen" description="Rückrufe, Fristen und alles, was nicht liegen bleiben darf." />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/wiedervorlagen?filter=${tab.key}`}
            aria-current={filter === tab.key ? "page" : undefined}
            className={cn(
              "rounded-[2px] border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              filter === tab.key ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {reminders.length ? (
        <Table
          head={
            <>
              <Th>Fällig</Th>
              <Th>Betreff</Th>
              <Th>Person</Th>
              <Th>Verantwortlich</Th>
              <Th></Th>
            </>
          }
        >
          {reminders.map((reminder) => {
            const overdue = reminder.dueDate < startOfDay;
            const person = reminder.candidate
              ? `${reminder.candidate.firstName} ${reminder.candidate.lastName}`
              : reminder.referral
                ? `${reminder.referral.referredFirstName ?? ""} ${reminder.referral.referredLastName ?? ""} (Empfehlung)`
                : "–";
            const href = reminder.application
              ? `/admin/bewerbungen/${reminder.application.id}`
              : reminder.referral
                ? `/admin/empfehlungen/${reminder.referral.id}`
                : null;
            return (
              <TrLink key={reminder.id}>
                <Td className="whitespace-nowrap">
                  {overdue ? <Badge tone="red">überfällig</Badge> : null} {formatDate(reminder.dueDate)}
                  {reminder.dueTime ? `, ${reminder.dueTime} Uhr` : ""}
                </Td>
                <Td className="font-semibold text-ink">{reminder.subject}</Td>
                <Td>{href ? <Link href={href} className="prose-link">{person}</Link> : person}</Td>
                <Td>{reminder.assignee.name}</Td>
                <Td className="text-right">
                  <form action={completeReminderAction}>
                    <input type="hidden" name="reminderId" value={reminder.id} />
                    <button type="submit" className="prose-link text-sm">
                      Erledigt
                    </button>
                  </form>
                </Td>
              </TrLink>
            );
          })}
        </Table>
      ) : (
        <EmptyState title="Nichts fällig" hint="Neue Wiedervorlagen legst Du direkt am Bewerber oder an einer Empfehlung an." />
      )}
    </>
  );
}
