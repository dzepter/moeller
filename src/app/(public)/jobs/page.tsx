import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedJobs, EINSATZBEREICH_LABEL, BESCHAEFTIGUNG_LABEL } from "@/server/jobs";
import { getPublishedContent, fText } from "@/server/cms";
import { JobRow } from "@/components/site/job-row";
import { Section, Eyebrow } from "@/components/site/section";
import { ButtonLink, Button, ArrowIcon } from "@/components/ui/button";
import { BUNDESLAND_LABEL } from "@/lib/utils";
import type { Beschaeftigungsart, Bundesland, Einsatzbereich } from "@prisma/client";
import { track } from "@/lib/analytics";

export const metadata: Metadata = {
  title: "Jobs & offene Stellen",
  description:
    "Offene Stellen bei der Möller GmbH: Promotion, Vertrieb, Messen und PoS-Betreuung in NRW, Hessen, Rheinland-Pfalz und Bayern. Bewirb Dich in 2 Minuten – ohne Anschreiben.",
};

const BL = Object.keys(BUNDESLAND_LABEL) as Bundesland[];
const EB = Object.keys(EINSATZBEREICH_LABEL) as Einsatzbereich[];
const BA = Object.keys(BESCHAEFTIGUNG_LABEL) as Beschaeftigungsart[];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const get = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);

  const bundesland = BL.includes(get("bundesland") as Bundesland) ? (get("bundesland") as Bundesland) : undefined;
  const einsatzbereich = EB.includes(get("bereich") as Einsatzbereich) ? (get("bereich") as Einsatzbereich) : undefined;
  const employmentType = BA.includes(get("art") as Beschaeftigungsart) ? (get("art") as Beschaeftigungsart) : undefined;
  const q = get("q")?.slice(0, 80);
  const ort = get("ort")?.slice(0, 60);

  const [content, jobs] = await Promise.all([
    getPublishedContent("jobs"),
    listPublishedJobs({ bundesland, einsatzbereich, employmentType, q, ort }),
  ]);

  const hasFilter = Boolean(bundesland || einsatzbereich || employmentType || q || ort);
  if (hasFilter) await track("jobfilter_genutzt");

  return (
    <>
      <Section className="pb-10 md:pb-12">
        <div className="site-container">
          <Eyebrow>Jobs bei Möller</Eyebrow>
          <h1 className="mt-4 max-w-2xl text-4xl md:text-5xl">{fText(content, "hero", "headline")}</h1>
          <p className="mt-4 max-w-2xl text-lg">{fText(content, "hero", "intro")}</p>
        </div>
      </Section>

      <div className="site-container pb-20 md:pb-28">
        {/* Filter: reines GET-Formular – funktioniert ohne JavaScript */}
        <form method="get" aria-label="Jobs filtern" className="grid gap-3 border-y border-line py-5 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Bundesland</span>
            <select name="bundesland" defaultValue={bundesland ?? ""} className="w-full rounded-[2px] border-[1.5px] border-line bg-white px-3 py-2 focus:border-brand focus:outline-none">
              <option value="">Alle</option>
              {BL.map((b) => (
                <option key={b} value={b}>
                  {BUNDESLAND_LABEL[b]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Einsatzgebiet</span>
            <select name="bereich" defaultValue={einsatzbereich ?? ""} className="w-full rounded-[2px] border-[1.5px] border-line bg-white px-3 py-2 focus:border-brand focus:outline-none">
              <option value="">Alle</option>
              {EB.map((b) => (
                <option key={b} value={b}>
                  {EINSATZBEREICH_LABEL[b]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">Beschäftigungsart</span>
            <select name="art" defaultValue={employmentType ?? ""} className="w-full rounded-[2px] border-[1.5px] border-line bg-white px-3 py-2 focus:border-brand focus:outline-none">
              <option value="">Alle</option>
              {BA.map((b) => (
                <option key={b} value={b}>
                  {BESCHAEFTIGUNG_LABEL[b]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">PLZ, Ort oder Stichwort</span>
            <input
              type="text"
              name="ort"
              defaultValue={ort ?? q ?? ""}
              placeholder="z. B. 55435 oder Frankfurt"
              className="w-full rounded-[2px] border-[1.5px] border-line bg-white px-3 py-2 placeholder:text-ink-mute focus:border-brand focus:outline-none"
            />
          </label>
          <div className="flex items-end">
            <Button type="submit" className="w-full md:w-auto">
              Filtern
            </Button>
          </div>
        </form>

        <div className="mt-2 flex items-center justify-between gap-4 py-3">
          <p className="text-sm text-ink-mute" aria-live="polite">
            {jobs.length === 1 ? "1 offene Stelle" : `${jobs.length} offene Stellen`}
            {hasFilter ? " für Deine Auswahl" : ""}
          </p>
          {hasFilter ? (
            <Link href="/jobs" className="prose-link text-sm">
              Filter zurücksetzen
            </Link>
          ) : null}
        </div>

        {jobs.length > 0 ? (
          <ul className="border-t border-line">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </ul>
        ) : (
          <div className="border-t border-line py-16 text-center">
            <h2 className="text-2xl">{fText(content, "empty", "title")}</h2>
            <p className="mx-auto mt-3 max-w-md text-ink-soft">{fText(content, "empty", "text")}</p>
            <div className="mt-7">
              <ButtonLink href="/initiativbewerbung" size="lg">
                Initiativbewerbung starten
                <ArrowIcon />
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
