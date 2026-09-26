import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, hasPermission, ForbiddenError } from "@/lib/rbac";
import { getApplicationDetail } from "@/server/candidates";
import { findDuplicateHints } from "@/server/applications";
import { PageHeader, Card, Badge, EmptyState } from "@/components/admin/ui";
import { statusLabel, statusTone, MANUAL_STATUS_LABEL, AUTO_STATUS_LABEL, REFERRAL_STATUS_LABEL } from "@/components/admin/status";
import { StatusForm, AssignForm, NoteForm, NoteItem, ReminderForm, Collapsible } from "@/components/admin/candidate-widgets";
import { completeReminderAction } from "@/app/actions/admin-candidates";
import { OnboardingCard } from "@/components/admin/onboarding-card";
import { BUNDESLAND_LABEL, formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Bewerbung" };

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  let app;
  try {
    app = await getApplicationDetail(user, id);
  } catch (err) {
    if (err instanceof ForbiddenError) notFound(); // kein Informationsleck über fremde Datensätze
    throw err;
  }
  if (!app) notFound();

  const canWrite = hasPermission(user, "candidates.write");
  const canAssign = hasPermission(user, "candidates.assign");
  const [regions, assignableUsers, duplicates] = await Promise.all([
    db.region.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    findDuplicateHints(app.candidateId),
  ]);

  const candidate = app.candidate;
  const timeline = [
    ...app.statusHistory.map((h) => ({
      at: h.createdAt,
      text: `Status: ${h.toManual ? MANUAL_STATUS_LABEL[h.toManual] : h.toAuto ? AUTO_STATUS_LABEL[h.toAuto] : "–"}${h.comment ? ` – „${h.comment}“` : ""}`,
    })),
    ...app.assignments.map((a) => ({
      at: a.createdAt,
      text: `Zuordnung: ${a.region.name}${a.assignedBy ? ` (durch ${a.assignedBy.name})` : ""}${a.reason ? ` – ${a.reason}` : ""}`,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <>
      <div className="mb-4 text-sm">
        <Link href="/admin/bewerbungen" className="prose-link">
          ← Zurück zur Liste
        </Link>
      </div>
      <PageHeader
        title={`${candidate.firstName} ${candidate.lastName}`}
        description={`${app.job?.title ?? "Initiativbewerbung"} · ${BUNDESLAND_LABEL[app.bundesland]} · Eingang ${formatDate(app.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone={statusTone(app)}>{statusLabel(app)}</Badge>
            <a href={`tel:${candidate.phone.replace(/\s/g, "")}`} className="rounded-[2px] bg-brand px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-deep">
              Anrufen
            </a>
            <a href={`mailto:${candidate.email}`} className="rounded-[2px] border-[1.5px] border-ink px-3.5 py-1.5 text-sm font-semibold text-ink hover:bg-ink hover:text-white">
              E-Mail
            </a>
          </div>
        }
      />

      {duplicates.length > 0 ? (
        <div className="mb-4 border-l-2 border-accent bg-warn-wash p-4 text-sm">
          <p className="font-semibold text-ink">Mögliche Duplikate gefunden:</p>
          <ul className="mt-1.5 space-y-1">
            {duplicates.map((d) => (
              <li key={d.id}>
                {d.firstName} {d.lastName} · {d.city} · {d.email} – Zusammenführen über den Bereich „Datenschutz“ oder nach Prüfung ignorieren.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card title="Kontakt & Bewerbungsdaten">
            <dl className="grid gap-x-6 gap-y-3 text-[0.95rem] sm:grid-cols-2">
              <Item label="Telefon"><a className="prose-link" href={`tel:${candidate.phone.replace(/\s/g, "")}`}>{candidate.phone}</a></Item>
              <Item label="E-Mail"><a className="prose-link" href={`mailto:${candidate.email}`}>{candidate.email}</a></Item>
              <Item label="Wohnort">{app.city}</Item>
              <Item label="Bundesland">{BUNDESLAND_LABEL[app.bundesland]}</Item>
              <Item label="Führerschein">{app.driversLicense ? "Ja" : "Nein"}</Item>
              {app.ownCar !== null ? <Item label="Eigenes Auto">{app.ownCar ? "Ja" : "Nein"}</Item> : null}
              <Item label="Bisherige Tätigkeit">{app.previousActivity}</Item>
              <Item label="Verfügbar ab">{app.availableFrom}</Item>
              <Item label="Quelle">
                {app.source === "MITARBEITEREMPFEHLUNG" ? "Mitarbeiterempfehlung" : app.source === "INITIATIV" ? "Initiativ" : "Website"}
                {app.utmSource ? ` · Kampagne: ${[app.utmSource, app.utmMedium, app.utmCampaign].filter(Boolean).join(" / ")}` : ""}
              </Item>
              <Item label="Consent-Version">{app.consentVersion}</Item>
              {app.cvFile ? (
                <Item label="Lebenslauf">
                  <a className="prose-link" href={`/api/admin/files/${app.cvFile.id}`}>
                    {app.cvFile.originalName}
                  </a>
                </Item>
              ) : null}
            </dl>
            {app.message ? (
              <div className="mt-4 border-t border-line-soft pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Nachricht</p>
                <p className="mt-1 whitespace-pre-wrap text-[0.95rem]">{app.message}</p>
              </div>
            ) : null}
          </Card>

          {app.referral ? (
            <Card title="Empfehlungs-Herkunft">
              <dl className="grid gap-x-6 gap-y-3 text-[0.95rem] sm:grid-cols-2">
                <Item label="Empfohlen von">
                  {app.referral.referrerFirstName} {app.referral.referrerLastName}
                </Item>
                <Item label="Kontakt Empfehlender">{app.referral.referrerEmail ?? app.referral.referrerPhone ?? "–"}</Item>
                <Item label="Referral-Status">{REFERRAL_STATUS_LABEL[app.referral.status] ?? app.referral.status}</Item>
                <Item label="Empfehlung vom">{formatDate(app.referral.createdAt)}</Item>
              </dl>
              <p className="mt-3 text-sm">
                <Link href={`/admin/empfehlungen/${app.referral.id}`} className="prose-link">
                  Zur Empfehlung
                </Link>
              </p>
            </Card>
          ) : null}

          <Card title="Interne Notizen">
            {canWrite ? <NoteForm candidateId={candidate.id} applicationId={app.id} /> : null}
            {candidate.notes.length ? (
              <ul className="mt-5 space-y-4">
                {candidate.notes.map((note) => (
                  <NoteItem
                    key={note.id}
                    applicationId={app.id}
                    note={{
                      id: note.id,
                      body: note.body,
                      createdAt: formatDateTime(note.createdAt),
                      authorName: note.author?.name ?? null,
                      edited: Array.isArray(note.editHistory) && (note.editHistory as unknown[]).length > 0,
                    }}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink-mute">Noch keine Notizen.</p>
            )}
          </Card>

          <Card title="Verlauf">
            <ol className="space-y-3">
              {timeline.map((entry, i) => (
                <li key={i} className="grid grid-cols-[auto_1fr] gap-3 text-[0.95rem]">
                  <span className="whitespace-nowrap pt-0.5 text-xs text-ink-mute">{formatDateTime(entry.at)}</span>
                  <span>{entry.text}</span>
                </li>
              ))}
              <li className="grid grid-cols-[auto_1fr] gap-3 text-[0.95rem]">
                <span className="whitespace-nowrap pt-0.5 text-xs text-ink-mute">{formatDateTime(app.createdAt)}</span>
                <span>Bewerbung eingegangen</span>
              </li>
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          {app.manualStatus === "ZUSAGE" ? (
            <OnboardingCard candidateId={candidate.id} assignments={candidate.trainingAssignments.map((t) => ({
              id: t.id,
              courseTitle: t.courseVersion.course.title,
              version: t.courseVersion.version,
              status: t.status,
              progressPct: t.progressPct,
              invitedAt: t.invitedAt ? formatDate(t.invitedAt) : null,
              completed: Boolean(t.completion?.passed),
            }))} />
          ) : null}

          {canWrite ? (
            <Collapsible summary="Status ändern" defaultOpen>
              <StatusForm applicationId={app.id} current={app.manualStatus} />
            </Collapsible>
          ) : null}

          {canWrite ? (
            <Collapsible summary="Wiedervorlage anlegen">
              <ReminderForm candidateId={candidate.id} applicationId={app.id} users={assignableUsers} defaultAssigneeId={user.id} />
            </Collapsible>
          ) : null}

          {canAssign ? (
            <Collapsible summary="Zuordnung ändern">
              <AssignForm
                applicationId={app.id}
                regions={regions}
                users={assignableUsers}
                currentRegionId={app.responsibleRegionId}
                currentUserId={app.assignedUserId}
              />
            </Collapsible>
          ) : null}

          <Card title="Offene Wiedervorlagen">
            {app.reminders.filter((r) => !r.done).length ? (
              <ul className="space-y-3">
                {app.reminders
                  .filter((r) => !r.done)
                  .map((reminder) => (
                    <li key={reminder.id} className="flex items-start justify-between gap-3 text-[0.95rem]">
                      <div>
                        <p className="font-semibold text-ink">{reminder.subject}</p>
                        <p className="text-xs text-ink-mute">
                          fällig {formatDate(reminder.dueDate)}
                          {reminder.dueTime ? `, ${reminder.dueTime} Uhr` : ""} · {reminder.assignee.name}
                        </p>
                      </div>
                      {canWrite ? (
                        <form action={completeReminderAction}>
                          <input type="hidden" name="reminderId" value={reminder.id} />
                          <input type="hidden" name="applicationId" value={app.id} />
                          <button type="submit" className="prose-link text-sm">
                            Erledigt
                          </button>
                        </form>
                      ) : null}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-mute">Keine offenen Wiedervorlagen.</p>
            )}
          </Card>

          {candidate.applications.length > 1 ? (
            <Card title="Weitere Bewerbungen dieser Person">
              <ul className="space-y-2 text-[0.95rem]">
                {candidate.applications
                  .filter((a) => a.id !== app.id)
                  .map((a) => (
                    <li key={a.id}>
                      <Link href={`/admin/bewerbungen/${a.id}`} className="prose-link">
                        Bewerbung vom {formatDate(a.createdAt)}
                      </Link>
                    </li>
                  ))}
              </ul>
            </Card>
          ) : null}
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
