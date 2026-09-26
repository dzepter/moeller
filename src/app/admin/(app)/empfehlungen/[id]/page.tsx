import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission, requireUser } from "@/lib/rbac";
import { referralDuplicates } from "@/server/referrals-admin";
import { PageHeader, Card, Badge } from "@/components/admin/ui";
import { REFERRAL_STATUS_LABEL } from "@/components/admin/status";
import { ReferralStatusForm, ReferralConvertForm } from "@/components/admin/referral-widgets";
import { ReminderForm } from "@/components/admin/candidate-widgets";
import { BUNDESLAND_LABEL, formatDate, formatDateTime } from "@/lib/utils";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = { title: "Empfehlung" };

export default async function ReferralDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("referrals.manage");
  const user = await requireUser();
  const { id } = await params;

  const referral = await db.referral.findUnique({
    where: { id },
    include: {
      statusHistory: { orderBy: { createdAt: "desc" } },
      application: { select: { id: true } },
      reminders: { where: { done: false }, include: { assignee: { select: { name: true } } } },
    },
  });
  if (!referral) notFound();

  const [duplicates, users, incentivesEnabled] = await Promise.all([
    referralDuplicates(referral),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getSetting("features.referralIncentives"),
  ]);

  return (
    <>
      <div className="mb-4 text-sm">
        <Link href="/admin/empfehlungen" className="prose-link">
          ← Zurück zur Liste
        </Link>
      </div>
      <PageHeader
        title={
          referral.referredFirstName
            ? `${referral.referredFirstName} ${referral.referredLastName}`
            : "Empfehlung (wartet auf Selbsteintrag)"
        }
        description={`Empfohlen von ${referral.referrerFirstName} ${referral.referrerLastName} · ${referral.type === "LINK" ? "über Empfehlungslink" : "Direktempfehlung"} · ${formatDate(referral.createdAt)}`}
        actions={<Badge tone={referral.status === "IN_BEWERBUNG_UEBERNOMMEN" ? "green" : "blue"}>{REFERRAL_STATUS_LABEL[referral.status]}</Badge>}
      />

      {duplicates.length > 0 && referral.status !== "IN_BEWERBUNG_UEBERNOMMEN" ? (
        <div className="mb-4 border-l-2 border-accent bg-warn-wash p-4 text-sm">
          <p className="font-semibold text-ink">Achtung, möglicher bestehender Kandidat:</p>
          <ul className="mt-1.5 space-y-1">
            {duplicates.map((d) => (
              <li key={d.id}>
                {d.firstName} {d.lastName} · {d.city} · {d.email} – bei der Übernahme unten kann mit
                diesem Datensatz verknüpft werden (kein doppelter Kandidat).
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card title="Empfohlene Person">
            {referral.referredFirstName ? (
              <dl className="grid gap-x-6 gap-y-3 text-[0.95rem] sm:grid-cols-2">
                <Item label="Name">{referral.referredFirstName} {referral.referredLastName}</Item>
                <Item label="Telefon">{referral.referredPhone ?? "–"}</Item>
                <Item label="E-Mail">{referral.referredEmail ?? "–"}</Item>
                <Item label="Wohnort">{referral.referredCity ?? "–"}</Item>
                <Item label="Bundesland">{referral.referredBundesland ? BUNDESLAND_LABEL[referral.referredBundesland] : "–"}</Item>
                {referral.note ? <Item label="Notiz">{referral.note}</Item> : null}
              </dl>
            ) : (
              <p className="text-sm text-ink-mute">
                Die empfohlene Person hat sich über den Link noch nicht eingetragen. Empfehlungscode:{" "}
                <span className="font-mono">{referral.code}</span>
              </p>
            )}
          </Card>

          <Card title="Empfehlende Person">
            <dl className="grid gap-x-6 gap-y-3 text-[0.95rem] sm:grid-cols-2">
              <Item label="Name">{referral.referrerFirstName} {referral.referrerLastName}</Item>
              <Item label="Kontakt">{referral.referrerEmail ?? referral.referrerPhone ?? "–"}</Item>
              {referral.referrerEmployeeNo ? <Item label="Mitarbeiternummer">{referral.referrerEmployeeNo}</Item> : null}
              {referral.consentConfirmed ? (
                <Item label="Einwilligung">
                  bestätigt am {referral.consentAt ? formatDateTime(referral.consentAt) : "–"} (Version {referral.consentVersion})
                </Item>
              ) : null}
              {incentivesEnabled ? <Item label="Incentive-Status">{referral.incentiveStatus}</Item> : null}
            </dl>
          </Card>

          <Card title="Verlauf">
            <ol className="space-y-3">
              {referral.statusHistory.map((h) => (
                <li key={h.id} className="grid grid-cols-[auto_1fr] gap-3 text-[0.95rem]">
                  <span className="whitespace-nowrap pt-0.5 text-xs text-ink-mute">{formatDateTime(h.createdAt)}</span>
                  <span>
                    {REFERRAL_STATUS_LABEL[h.toStatus]}
                    {h.comment ? ` – „${h.comment}“` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          {referral.application ? (
            <Card title="Übernommen">
              <p className="text-[0.95rem]">
                Diese Empfehlung wurde in eine Bewerbung übernommen:{" "}
                <Link href={`/admin/bewerbungen/${referral.application.id}`} className="prose-link">
                  Zur Bewerbung
                </Link>
              </p>
            </Card>
          ) : (
            <>
              <Card title="Status ändern">
                <ReferralStatusForm referralId={referral.id} current={referral.status} />
              </Card>
              {referral.referredFirstName ? (
                <Card title="In Bewerbung übernehmen">
                  <ReferralConvertForm referralId={referral.id} duplicates={duplicates} />
                </Card>
              ) : null}
            </>
          )}

          <Card title="Wiedervorlage">
            {referral.reminders.length ? (
              <ul className="mb-4 space-y-2 text-[0.95rem]">
                {referral.reminders.map((r) => (
                  <li key={r.id}>
                    <span className="font-semibold text-ink">{r.subject}</span>{" "}
                    <span className="text-xs text-ink-mute">
                      fällig {formatDate(r.dueDate)} · {r.assignee.name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <ReminderForm referralId={referral.id} users={users} defaultAssigneeId={user.id} />
          </Card>
        </div>
      </div>
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
