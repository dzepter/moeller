import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { Eyebrow, CheckList } from "@/components/site/section";
import { RichText } from "@/components/site/richtext";
import { BUNDESLAND_LABEL, formatDate } from "@/lib/utils";
import { EINSATZBEREICH_LABEL, BESCHAEFTIGUNG_LABEL } from "@/server/jobs";

export const metadata: Metadata = { title: "Vorschau" };

export default async function StellenVorschauPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("jobs.manage");
  const { id } = await params;
  const job = await db.job.findUnique({ where: { id } });
  if (!job) notFound();
  const description = job.description as { text?: string } | null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-4 border-l-2 border-accent bg-warn-wash px-4 py-3 text-sm">
        <p>
          <strong>Vorschau</strong> – so sieht die Stelle öffentlich aus (Status: {job.status}).
        </p>
        <Link href={`/admin/stellen/${job.id}`} className="prose-link whitespace-nowrap">
          Zurück zur Bearbeitung
        </Link>
      </div>

      <article className="border border-line bg-white p-6 md:p-10">
        <Eyebrow>{EINSATZBEREICH_LABEL[job.einsatzbereich]}</Eyebrow>
        <h1 className="mt-4 text-3xl md:text-4xl">{job.title}</h1>
        <p className="mt-4 text-lg">{job.intro}</p>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-5 text-[0.95rem] sm:grid-cols-4">
          <div>
            <dt className="text-ink-mute">Ort / Region</dt>
            <dd className="font-semibold text-ink">{job.city}</dd>
          </div>
          <div>
            <dt className="text-ink-mute">Bundesland</dt>
            <dd className="font-semibold text-ink">{BUNDESLAND_LABEL[job.bundesland]}</dd>
          </div>
          <div>
            <dt className="text-ink-mute">Beschäftigungsart</dt>
            <dd className="font-semibold text-ink">{BESCHAEFTIGUNG_LABEL[job.employmentType]}</dd>
          </div>
          <div>
            <dt className="text-ink-mute">Start</dt>
            <dd className="font-semibold text-ink">{job.startDate ? formatDate(job.startDate) : "nach Absprache"}</dd>
          </div>
        </dl>

        {description?.text ? <RichText className="mt-8" text={description.text} /> : null}

        <h2 className="mt-8 text-2xl">Deine Aufgaben</h2>
        <CheckList className="mt-4" items={job.tasks} />
        <h2 className="mt-8 text-2xl">Das bringst Du mit</h2>
        <CheckList className="mt-4" items={job.requirements} />
        <h2 className="mt-8 text-2xl">Das bekommst Du von uns</h2>
        <CheckList className="mt-4" items={job.benefits} />
      </article>
    </div>
  );
}
