import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, hasPermission } from "@/lib/rbac";
import { listAssignments } from "@/server/academy/service";
import { resendInvitationAction, revokeInvitationAction } from "@/app/actions/academy";
import { createDraftAction } from "@/app/actions/admin-academy-content";
import { PageHeader, Table, Th, Td, TrLink, Badge, EmptyState, Card } from "@/components/admin/ui";
import { BUNDESLAND_KURZ, formatDate, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Academy" };

const STATUS_LABEL: Record<string, string> = {
  NICHT_EINGELADEN: "Nicht eingeladen",
  EINGELADEN: "Einladung versendet",
  BEGONNEN: "Begonnen",
  IN_BEARBEITUNG: "In Bearbeitung",
  ABGESCHLOSSEN: "Abgeschlossen",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AcademyAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const canManage = hasPermission(user, "academy.manageParticipants");
  const canView = canManage || hasPermission(user, "academy.viewRegional");
  if (!canView) redirect("/admin");
  const canEdit = hasPermission(user, "academy.editContent");

  const params = await searchParams;
  const status = typeof params.status === "string" && params.status ? params.status : undefined;

  const [assignments, courses] = await Promise.all([
    listAssignments(user, { status }),
    canEdit
      ? db.trainingCourse.findMany({
          include: { versions: { orderBy: { version: "desc" }, include: { _count: { select: { assignments: true, completions: true } } } } },
        })
      : Promise.resolve([]),
  ]);

  const overdueDays = 14;
  // Server Component: einmal pro Request ausgewertet
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <>
      <PageHeader
        title="Academy"
        description="Onboarding-Schulungen: Wer ist eingeladen, wer hängt fest, wer ist fertig? Einladungen startest Du direkt am Bewerber (Status „Zusage“)."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { key: "", label: "Alle" },
          { key: "EINGELADEN", label: "Nicht begonnen" },
          { key: "BEGONNEN", label: "Begonnen" },
          { key: "IN_BEARBEITUNG", label: "In Bearbeitung" },
          { key: "ABGESCHLOSSEN", label: "Abgeschlossen" },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={tab.key ? `/admin/academy?status=${tab.key}` : "/admin/academy"}
            className={cn(
              "rounded-[2px] border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              (status ?? "") === tab.key ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {assignments.length ? (
        <Table
          head={
            <>
              <Th>Teilnehmer</Th>
              <Th>Kurs</Th>
              <Th>Status</Th>
              <Th>Fortschritt</Th>
              <Th>Eingeladen</Th>
              <Th>Zugriffe</Th>
              {canManage ? <Th>Aktionen</Th> : null}
            </>
          }
        >
          {assignments.map((a) => {
            const overdue =
              a.status !== "ABGESCHLOSSEN" && a.invitedAt && now - a.invitedAt.getTime() > overdueDays * 86_400_000;
            return (
              <TrLink key={a.id} className={overdue ? "bg-warn-wash/50" : undefined}>
                <Td className="font-semibold text-ink">
                  {a.candidate.firstName} {a.candidate.lastName}
                  <span className="block text-xs font-normal text-ink-mute">
                    {BUNDESLAND_KURZ[a.candidate.bundesland]} · {a.candidate.email}
                  </span>
                </Td>
                <Td>
                  {a.courseVersion.course.title} <span className="text-ink-mute">v{a.courseVersion.version}</span>
                </Td>
                <Td>
                  <Badge tone={a.status === "ABGESCHLOSSEN" ? "green" : a.status === "EINGELADEN" ? "blue" : "yellow"}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </Badge>
                  {overdue ? <Badge tone="red">überfällig</Badge> : null}
                  {a.completion ? (
                    <span className="block text-xs text-ink-mute">
                      {formatDate(a.completion.completedAt)} · {a.completion.scorePct} %
                    </span>
                  ) : null}
                </Td>
                <Td>
                  <div className="h-1.5 w-24 bg-paper-warm">
                    <div className="h-full bg-brand" style={{ width: `${a.progressPct}%` }} aria-hidden="true" />
                  </div>
                  <span className="text-xs text-ink-mute">{a.progressPct} %</span>
                </Td>
                <Td className="whitespace-nowrap text-xs">{a.invitedAt ? formatDate(a.invitedAt) : "–"}</Td>
                <Td className="whitespace-nowrap text-xs text-ink-mute">
                  {a.firstAccessAt ? `erster: ${formatDate(a.firstAccessAt)}` : "noch keiner"}
                  {a.lastAccessAt ? <span className="block">letzter: {formatDate(a.lastAccessAt)}</span> : null}
                </Td>
                {canManage ? (
                  <Td>
                    {a.status !== "ABGESCHLOSSEN" ? (
                      <div className="flex flex-col gap-1 text-sm">
                        <form action={resendInvitationAction}>
                          <input type="hidden" name="assignmentId" value={a.id} />
                          <button type="submit" className="prose-link">
                            Erneut einladen
                          </button>
                        </form>
                        {a.invitations.length ? (
                          <form action={revokeInvitationAction}>
                            <input type="hidden" name="assignmentId" value={a.id} />
                            <button type="submit" className="font-medium text-danger hover:underline">
                              Link widerrufen
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </Td>
                ) : null}
              </TrLink>
            );
          })}
        </Table>
      ) : (
        <EmptyState
          title="Noch keine Teilnehmer"
          hint="Setze eine Bewerbung auf „Zusage“ und klicke dort auf „Onboarding starten“ – dann erscheint die Person hier."
        />
      )}

      {canEdit && courses.length ? (
        <Card title="Kursversionen & Inhalte" className="mt-6">
          {courses.map((course) => (
            <div key={course.id} className="space-y-2">
              <p className="font-semibold text-ink">{course.title}</p>
              <ul className="space-y-1.5 text-[0.9rem]">
                {course.versions.map((version) => (
                  <li key={version.id} className="flex flex-wrap items-center gap-3">
                    <Badge tone={version.publishedAt ? "green" : "yellow"}>
                      v{version.version} {version.publishedAt ? "veröffentlicht" : "Entwurf"}
                    </Badge>
                    <span className="text-ink-mute">
                      {version._count.assignments} Teilnehmer · {version._count.completions} Abschlüsse
                    </span>
                    <Link href={`/admin/academy/inhalte/${version.id}`} className="prose-link">
                      {version.publishedAt ? "Inhalte ansehen" : "Inhalte bearbeiten"}
                    </Link>
                  </li>
                ))}
              </ul>
              <DraftButton courseId={course.id} hasDraft={course.versions.some((v) => !v.publishedAt)} />
            </div>
          ))}
        </Card>
      ) : null}
    </>
  );
}

function DraftButton({ courseId, hasDraft }: { courseId: string; hasDraft: boolean }) {
  if (hasDraft) return null;
  return (
    <form action={createDraftAction}>
      <input type="hidden" name="courseId" value={courseId} />
      <button type="submit" className="prose-link text-sm">
        Neuen Entwurf erstellen (Kopie der aktuellen Version)
      </button>
    </form>
  );
}
