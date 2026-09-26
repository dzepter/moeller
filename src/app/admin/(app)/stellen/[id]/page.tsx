import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { PageHeader, Badge } from "@/components/admin/ui";
import { JobForm } from "@/components/admin/job-form";

export const metadata: Metadata = { title: "Stelle bearbeiten" };

function toLocalInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function StelleBearbeitenPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("jobs.manage");
  const { id } = await params;
  const job = await db.job.findUnique({ where: { id } });
  if (!job) notFound();

  return (
    <>
      <div className="mb-4 text-sm">
        <Link href="/admin/stellen" className="prose-link">
          ← Zurück zur Liste
        </Link>
      </div>
      <PageHeader
        title={job.title}
        description={`Status: ${job.status === "VEROEFFENTLICHT" ? "Veröffentlicht" : job.status === "ENTWURF" ? "Entwurf" : job.status === "PAUSIERT" ? "Pausiert" : "Archiviert"} · /jobs/${job.slug}`}
        actions={
          <>
            {job.status === "VEROEFFENTLICHT" ? (
              <a href={`/jobs/${job.slug}`} target="_blank" rel="noopener" className="prose-link text-sm">
                Öffentliche Seite ansehen
              </a>
            ) : (
              <a href={`/admin/stellen/${job.id}/vorschau`} target="_blank" className="prose-link text-sm">
                Vorschau öffnen
              </a>
            )}
            <Badge tone={job.status === "VEROEFFENTLICHT" ? "green" : "neutral"}>{job.status}</Badge>
          </>
        }
      />
      <JobForm
        job={{
          id: job.id,
          title: job.title,
          slug: job.slug,
          bundesland: job.bundesland,
          city: job.city,
          plz: job.plz ?? "",
          einsatzbereich: job.einsatzbereich,
          employmentType: job.employmentType,
          startDate: job.startDate ? job.startDate.toISOString().slice(0, 10) : "",
          endDate: job.endDate ? job.endDate.toISOString().slice(0, 10) : "",
          intro: job.intro,
          descriptionText: (job.description as { text?: string } | null)?.text ?? "",
          tasks: job.tasks.join("\n"),
          requirements: job.requirements.join("\n"),
          benefits: job.benefits.join("\n"),
          contactName: job.contactName ?? "",
          contactPhone: job.contactPhone ?? "",
          publishAt: toLocalInput(job.publishAt),
          expiresAt: toLocalInput(job.expiresAt),
          autoDeactivate: job.autoDeactivate,
          driversLicense: job.driversLicense,
          ownCar: job.ownCar,
          cvUploadEnabled: job.cvUploadEnabled,
          indexable: job.indexable,
        }}
      />
    </>
  );
}
