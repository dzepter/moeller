import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { PageHeader, Table, Th, Td, TrLink, Badge, EmptyState } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { jobTransitionAction } from "@/app/actions/admin-jobs";
import { BUNDESLAND_KURZ, formatDate } from "@/lib/utils";
import type { JobStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Stellen" };

const STATUS_LABEL: Record<JobStatus, string> = {
  ENTWURF: "Entwurf",
  VEROEFFENTLICHT: "Veröffentlicht",
  PAUSIERT: "Pausiert",
  ARCHIVIERT: "Archiviert",
};

const STATUS_TONE: Record<JobStatus, "neutral" | "green" | "yellow" | "red"> = {
  ENTWURF: "neutral",
  VEROEFFENTLICHT: "green",
  PAUSIERT: "yellow",
  ARCHIVIERT: "red",
};

export default async function StellenPage() {
  await requirePermission("jobs.manage");
  const jobs = await db.job.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { _count: { select: { applications: true } } },
  });

  return (
    <>
      <PageHeader
        title="Stellen"
        description="Stellen anlegen, veröffentlichen, pausieren – ohne technische Kenntnisse."
        actions={<ButtonLink href="/admin/stellen/neu">Neue Stelle</ButtonLink>}
      />

      {jobs.length ? (
        <Table
          head={
            <>
              <Th>Titel</Th>
              <Th>Ort</Th>
              <Th>Land</Th>
              <Th>Status</Th>
              <Th>Bewerbungen</Th>
              <Th>Terminierung</Th>
              <Th>Aktionen</Th>
            </>
          }
        >
          {jobs.map((job) => (
            <TrLink key={job.id}>
              <Td className="font-semibold text-ink">
                <Link href={`/admin/stellen/${job.id}`} className="hover:text-brand">
                  {job.title}
                </Link>
              </Td>
              <Td>{job.city}</Td>
              <Td>{BUNDESLAND_KURZ[job.bundesland]}</Td>
              <Td>
                <Badge tone={STATUS_TONE[job.status]}>{STATUS_LABEL[job.status]}</Badge>
              </Td>
              <Td>{job._count.applications}</Td>
              <Td className="text-xs text-ink-mute">
                {job.publishAt ? `Veröffentlichung ${formatDate(job.publishAt)}` : ""}
                {job.publishAt && job.expiresAt ? " · " : ""}
                {job.expiresAt ? `Ablauf ${formatDate(job.expiresAt)}` : ""}
                {!job.publishAt && !job.expiresAt ? "–" : ""}
              </Td>
              <Td>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {job.status === "VEROEFFENTLICHT" ? (
                    <a href={`/jobs/${job.slug}`} target="_blank" rel="noopener" className="prose-link">
                      Ansehen
                    </a>
                  ) : (
                    <a href={`/admin/stellen/${job.id}/vorschau`} target="_blank" className="prose-link">
                      Vorschau
                    </a>
                  )}
                  {job.status !== "VEROEFFENTLICHT" ? <Transition id={job.id} to="VEROEFFENTLICHT" label="Veröffentlichen" /> : null}
                  {job.status === "VEROEFFENTLICHT" ? <Transition id={job.id} to="PAUSIERT" label="Pausieren" /> : null}
                  {job.status === "PAUSIERT" ? <Transition id={job.id} to="VEROEFFENTLICHT" label="Reaktivieren" /> : null}
                  {job.status !== "ARCHIVIERT" ? <Transition id={job.id} to="ARCHIVIERT" label="Archivieren" /> : <Transition id={job.id} to="ENTWURF" label="Reaktivieren als Entwurf" />}
                  <Transition id={job.id} to="DUPLIZIEREN" label="Duplizieren" />
                </div>
              </Td>
            </TrLink>
          ))}
        </Table>
      ) : (
        <EmptyState
          title="Noch keine Stellen angelegt"
          action={<ButtonLink href="/admin/stellen/neu">Erste Stelle anlegen</ButtonLink>}
        />
      )}
    </>
  );
}

function Transition({ id, to, label }: { id: string; to: string; label: string }) {
  return (
    <form action={jobTransitionAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="to" value={to} />
      <button type="submit" className="prose-link">
        {label}
      </button>
    </form>
  );
}
