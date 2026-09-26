import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedJob, getUnpublishedJobStatus, EINSATZBEREICH_LABEL, BESCHAEFTIGUNG_LABEL } from "@/server/jobs";
import { getSetting } from "@/lib/settings";
import { env } from "@/lib/env";
import { BUNDESLAND_LABEL, formatDate } from "@/lib/utils";
import { Section, Eyebrow, CheckList } from "@/components/site/section";
import { ApplicationForm } from "@/components/site/application-form";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { ShareRow } from "@/components/site/share-row";
import { RichText } from "@/components/site/richtext";
import { track } from "@/lib/analytics";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublishedJob(slug);
  if (!job) return { title: "Stelle nicht mehr verfügbar", robots: { index: false, follow: true } };
  return {
    title: `${job.title} – ${job.city}`,
    description: job.intro.slice(0, 155),
    alternates: { canonical: `/jobs/${job.slug}` },
    robots: job.indexable ? undefined : { index: false, follow: false },
    openGraph: {
      title: `${job.title} – ${job.city} | Möller GmbH`,
      description: job.intro.slice(0, 200),
      type: "website",
      url: `${env.baseUrl}/jobs/${job.slug}`,
    },
  };
}

export default async function JobDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const job = await getPublishedJob(slug);

  if (!job) {
    // 410-Strategie für abgelaufene/archivierte Stellen (SEO, Masterprompt §36)
    const gone = await getUnpublishedJobStatus(slug);
    if (gone) return <JobGone />;
    notFound();
  }

  await track("job_angesehen");
  const [consentText, address] = await Promise.all([
    getSetting("applications.consentText"),
    getSetting("contact.address"),
  ]);

  const jobUrl = `${env.baseUrl}/jobs/${job.slug}`;
  const description = job.description as { text?: string } | null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: `${job.intro}\n\nAufgaben: ${job.tasks.join("; ")}\nVoraussetzungen: ${job.requirements.join("; ")}`,
    datePosted: (job.publishedAt ?? job.createdAt).toISOString().slice(0, 10),
    ...(job.expiresAt ? { validThrough: job.expiresAt.toISOString() } : {}),
    employmentType:
      job.employmentType === "VOLLZEIT"
        ? "FULL_TIME"
        : job.employmentType === "TEILZEIT"
          ? "PART_TIME"
          : job.employmentType === "MINIJOB"
            ? "PART_TIME"
            : "CONTRACTOR",
    hiringOrganization: {
      "@type": "Organization",
      name: "Möller GmbH",
      sameAs: env.baseUrl,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.city,
        ...(job.plz ? { postalCode: job.plz } : {}),
        addressRegion: BUNDESLAND_LABEL[job.bundesland],
        addressCountry: "DE",
      },
    },
    directApply: true,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Section className="pb-12">
        <div className="site-container">
          <nav aria-label="Pfad" className="text-sm text-ink-mute">
            <Link href="/jobs" className="prose-link">
              Jobs
            </Link>{" "}
            / {job.title}
          </nav>

          <div className="mt-6 grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Eyebrow>{EINSATZBEREICH_LABEL[job.einsatzbereich]}</Eyebrow>
              <h1 className="mt-4 text-3xl md:text-5xl">{job.title}</h1>
              <p className="mt-5 max-w-2xl text-lg">{job.intro}</p>

              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-6 text-[0.95rem] sm:grid-cols-4">
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
            </div>

            <aside className="lg:col-span-4">
              <div className="border border-line bg-paper-warm p-6">
                <p className="font-display text-lg font-bold text-ink">In 2 Minuten bewerben</p>
                <p className="mt-2 text-[0.95rem] text-ink-soft">
                  Kein Anschreiben, kein Konto – nur die wichtigsten Angaben.
                </p>
                <ButtonLink href="#bewerben" className="mt-4 w-full" size="lg">
                  Jetzt bewerben
                  <ArrowIcon />
                </ButtonLink>
                {job.contactName ? (
                  <p className="mt-5 border-t border-line pt-4 text-sm text-ink-soft">
                    Dein Ansprechpartner: <span className="font-semibold text-ink">{job.contactName}</span>
                    {job.contactPhone ? (
                      <>
                        {" "}
                        · <a className="prose-link" href={`tel:${job.contactPhone.replace(/\s/g, "")}`}>{job.contactPhone}</a>
                      </>
                    ) : null}
                  </p>
                ) : null}
                <ShareRow url={jobUrl} title={job.title} />
              </div>
            </aside>
          </div>
        </div>
      </Section>

      <div className="site-container grid gap-12 pb-16 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-8">
          {description?.text ? <RichText text={description.text} /> : null}

          <section aria-labelledby="tasks-h">
            <h2 id="tasks-h" className="text-2xl">
              Deine Aufgaben
            </h2>
            <CheckList className="mt-5" items={job.tasks} />
          </section>

          <section aria-labelledby="req-h">
            <h2 id="req-h" className="text-2xl">
              Das bringst Du mit
            </h2>
            <CheckList className="mt-5" items={job.requirements} />
          </section>

          <section aria-labelledby="ben-h">
            <h2 id="ben-h" className="text-2xl">
              Das bekommst Du von uns
            </h2>
            <CheckList className="mt-5" items={job.benefits} />
          </section>
        </div>

        <aside className="lg:col-span-4">
          <div className="border border-line p-6 text-center">
            <p className="font-display font-bold text-ink">Job teilen oder am Handy öffnen</p>
            <Image
              src={`/api/qr?path=${encodeURIComponent(`/jobs/${job.slug}`)}`}
              alt={`QR-Code für die Stelle ${job.title}`}
              width={180}
              height={180}
              className="mx-auto mt-4"
              unoptimized
            />
            <p className="mt-3 text-sm text-ink-mute">
              QR-Code scannen und die Stelle direkt am Smartphone ansehen oder weiterschicken.
            </p>
          </div>
        </aside>
      </div>

      <Section tone="warm" id="bewerben" aria-labelledby="apply-h" className="scroll-mt-20">
        <div className="site-container">
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Bewerbung</Eyebrow>
            <h2 id="apply-h" className="mt-4 text-3xl">
              Bewirb Dich auf: {job.title}
            </h2>
            <p className="mt-3 text-ink-soft">
              Dauert keine zwei Minuten. Wir melden uns zeitnah persönlich bei Dir – Standort {address.city}.
            </p>
            <div className="mt-9">
              <ApplicationForm
                jobSlug={job.slug}
                jobBundesland={job.bundesland}
                askOwnCar={job.ownCar !== "NICHT_NOTWENDIG"}
                cvUploadEnabled={job.cvUploadEnabled}
                consentText={consentText}
              />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

function JobGone() {
  return (
    <Section>
      <div className="site-container max-w-2xl">
        <Eyebrow>Stelle nicht mehr verfügbar</Eyebrow>
        <h1 className="mt-4 text-4xl">Diese Stelle ist bereits vergeben oder abgelaufen.</h1>
        <p className="mt-4 text-lg">
          Aber: Bei uns tut sich laufend etwas. Schau Dir die aktuellen Stellen an – oder schick uns
          eine Initiativbewerbung, dann melden wir uns, sobald etwas in Deiner Region frei wird.
        </p>
        <div className="mt-8 flex flex-wrap gap-3.5">
          <ButtonLink href="/jobs" size="lg">
            Aktuelle Jobs ansehen
            <ArrowIcon />
          </ButtonLink>
          <ButtonLink href="/initiativbewerbung" variant="outline" size="lg">
            Initiativbewerbung
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
