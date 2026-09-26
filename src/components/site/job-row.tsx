import Link from "next/link";
import type { Beschaeftigungsart, Bundesland, Einsatzbereich } from "@prisma/client";
import { BUNDESLAND_KURZ } from "@/lib/utils";
import { BESCHAEFTIGUNG_LABEL, EINSATZBEREICH_LABEL } from "@/server/jobs";
import { ArrowIcon } from "@/components/ui/button";

export type JobRowData = {
  slug: string;
  title: string;
  city: string;
  bundesland: Bundesland;
  einsatzbereich: Einsatzbereich;
  employmentType: Beschaeftigungsart;
};

/**
 * Ruhige Listenzeile statt schwebender Karte: Hairlines, klare Typo,
 * Hover-Unterstreichung + Pfeil.
 */
export function JobRow({ job }: { job: JobRowData }) {
  return (
    <li className="group border-b border-line">
      <Link
        href={`/jobs/${job.slug}`}
        className="flex items-center justify-between gap-4 py-5 transition-colors hover:bg-paper-warm md:px-4 md:-mx-4"
      >
        <div>
          <h3 className="font-display text-lg font-bold text-ink transition-colors group-hover:text-brand md:text-xl">
            {job.title}
          </h3>
          <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[0.9rem] text-ink-mute">
            <span>{job.city}</span>
            <span aria-hidden="true">·</span>
            <span>{BUNDESLAND_KURZ[job.bundesland]}</span>
            <span aria-hidden="true">·</span>
            <span>{EINSATZBEREICH_LABEL[job.einsatzbereich]}</span>
            <span aria-hidden="true">·</span>
            <span>{BESCHAEFTIGUNG_LABEL[job.employmentType]}</span>
          </p>
        </div>
        <ArrowIcon className="h-5 w-5 shrink-0 text-line transition-all group-hover:translate-x-1 group-hover:text-brand" />
      </Link>
    </li>
  );
}
