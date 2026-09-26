import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedContent, fText, fPairs, fList, fImage, parseImageLines } from "@/server/cms";
import { featuredJobs } from "@/server/jobs";
import { getSetting } from "@/lib/settings";
import { Section, SectionHeading, Eyebrow, CheckList } from "@/components/site/section";
import { JobRow } from "@/components/site/job-row";
import { Jobfinder } from "@/components/site/jobfinder";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { waLink, telLink } from "@/components/site/contact-links";
import { initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Möller GmbH – Menschen, die Marken am PoS voranbringen",
  description:
    "Promotion, Vertrieb und dauerhafte PoS-Betreuung in NRW, Hessen, Rheinland-Pfalz und Bayern. Seit über 15 Jahren als Möller GmbH – jetzt bewerben oder Projekt anfragen.",
};

export default async function HomePage() {
  const [content, jobs, phone, waNumber, waTextBewerber, hours, address, email] = await Promise.all([
    getPublishedContent("home"),
    featuredJobs(4),
    getSetting("contact.phone"),
    getSetting("contact.whatsappNumber"),
    getSetting("whatsapp.text.bewerber"),
    getSetting("contact.openingHours"),
    getSetting("contact.address"),
    getSetting("contact.email"),
  ]);

  const heroImage = fImage(content, "hero", "image");
  const ceoImage = fImage(content, "ceo", "image");
  const workImage = fImage(content, "work", "image");
  const facts = fPairs(content, "facts", "items");
  const gallery = parseImageLines(fList(content, "gallery", "images"));

  return (
    <>
      {/* ============ 1 · Premium Hero ============ */}
      <Section className="overflow-x-clip pb-0 md:pb-0 pt-12 md:pt-20" aria-labelledby="hero-h">
        <div className="site-container">
          <div className="grid items-start gap-10 lg:grid-cols-12">
            <div className="rise-in lg:col-span-7 lg:pt-6">
              <Eyebrow>Beratungs- &amp; Vertriebsgesellschaft</Eyebrow>
              <h1 id="hero-h" className="mt-5 font-display text-[2.6rem] leading-[1.05] font-extrabold text-ink md:text-[3.6rem] lg:text-[4.1rem]">
                {fText(content, "hero", "headline")}
              </h1>
              <p className="mt-6 max-w-xl text-lg text-ink-soft md:text-xl">
                {fText(content, "hero", "subline")}
              </p>
              <div className="mt-9 flex flex-wrap gap-3.5">
                <ButtonLink href={fText(content, "hero", "ctaPrimaryHref") || "/jobs"} size="lg">
                  {fText(content, "hero", "ctaPrimary")}
                  <ArrowIcon />
                </ButtonLink>
                <ButtonLink href={fText(content, "hero", "ctaSecondaryHref") || "/fuer-unternehmen"} size="lg" variant="outline">
                  {fText(content, "hero", "ctaSecondary")}
                </ButtonLink>
              </div>
            </div>

            {heroImage ? (
              <figure className="rise-in-late lg:col-span-5">
                <div className="slant-img relative aspect-[4/3] lg:aspect-[5/6]">
                  <Image
                    src={heroImage.src}
                    alt={heroImage.alt}
                    fill
                    priority
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover"
                  />
                </div>
                {fText(content, "hero", "imageCaption") ? (
                  <figcaption className="mt-3 text-sm text-ink-mute">
                    {fText(content, "hero", "imageCaption")}
                  </figcaption>
                ) : null}
              </figure>
            ) : null}
          </div>

          {/* ============ 2 · Vertrauensfakten ============ */}
          <dl className="mt-14 grid grid-cols-2 gap-y-8 border-t border-line py-9 md:mt-20 lg:grid-cols-4">
            {facts.map((fact, i) => (
              <div key={i} className="flex flex-col border-l border-line pl-5 first:border-l-0 first:pl-0 lg:pl-8 lg:first:pl-0 max-lg:odd:border-l-0 max-lg:odd:pl-0">
                <dt className="order-2 mt-1 text-[0.9rem] text-ink-mute">{fact.b}</dt>
                <dd className="order-1 font-display text-3xl font-extrabold text-ink md:text-4xl">{fact.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {/* ============ 3 · Jobfinder ============ */}
      <Section tone="ink" className="slant-b relative pb-20 md:pb-28" aria-labelledby="jobfinder-h">
        <div className="site-container">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <Eyebrow light>{fText(content, "jobfinder", "eyebrow")}</Eyebrow>
              <h2 id="jobfinder-h" className="mt-4 text-3xl text-white md:text-4xl">
                {fText(content, "jobfinder", "title")}
              </h2>
              <p className="mt-4 text-white/70">{fText(content, "jobfinder", "intro")}</p>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <div className="bg-white p-6 md:p-8">
                <Jobfinder />
                <p className="mt-4 text-sm text-ink-mute">
                  Nichts dabei?{" "}
                  <Link href="/initiativbewerbung" className="prose-link">
                    Schick uns eine Initiativbewerbung.
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ============ 4 · Leistungen für Unternehmen ============ */}
      <Section aria-labelledby="services-h" className="pt-20 md:pt-28">
        <div className="site-container">
          <SectionHeading
            eyebrow={fText(content, "services", "eyebrow")}
            title={fText(content, "services", "title")}
            intro={fText(content, "services", "intro")}
          />

          <div className="mt-14 space-y-16 md:mt-20 md:space-y-24">
            {/* Block 1: Bild rechts */}
            <ServiceBlock
              number="01"
              title={fText(content, "serviceBlock1", "title")}
              text={fText(content, "serviceBlock1", "text")}
              bullets={fList(content, "serviceBlock1", "bullets")}
              image={fImage(content, "serviceBlock1", "image")}
              imageSide="right"
            />
            {/* Block 2: Bild links */}
            <ServiceBlock
              number="02"
              title={fText(content, "serviceBlock2", "title")}
              text={fText(content, "serviceBlock2", "text")}
              bullets={fList(content, "serviceBlock2", "bullets")}
              image={fImage(content, "serviceBlock2", "image")}
              imageSide="left"
            />
            {/* Block 3: ohne Bild, kompakt mit Abschluss-CTA */}
            <div className="grid gap-8 border-t border-line pt-12 md:grid-cols-12 md:pt-16">
              <div className="md:col-span-3">
                <span className="block-number">03</span>
                <h3 className="mt-2 text-2xl">{fText(content, "serviceBlock3", "title")}</h3>
              </div>
              <div className="md:col-span-5">
                <p>{fText(content, "serviceBlock3", "text")}</p>
                <CheckList className="mt-5" items={fList(content, "serviceBlock3", "bullets")} />
              </div>
              <div className="md:col-span-3 md:col-start-10">
                <ButtonLink href="/fuer-unternehmen" variant="outline" className="w-full md:w-auto">
                  Alle Leistungen ansehen
                  <ArrowIcon />
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ============ 5 · Arbeiten bei Möller ============ */}
      <Section tone="warm" aria-labelledby="work-h">
        <div className="site-container grid items-start gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <SectionHeading
              eyebrow={fText(content, "work", "eyebrow")}
              title={fText(content, "work", "title")}
              intro={fText(content, "work", "text")}
            />
            <CheckList className="mt-8" items={fList(content, "work", "benefits")} />
            <div className="mt-9 flex flex-wrap gap-3.5">
              <ButtonLink href="/arbeiten-bei-moeller">Mehr über den Einstieg</ButtonLink>
              <ButtonLink href="/empfehlen" variant="ghost">
                Du kennst jemanden? Jetzt empfehlen
              </ButtonLink>
            </div>
          </div>
          {workImage ? (
            <figure className="lg:col-span-5 lg:col-start-8 lg:sticky lg:top-24">
              <div className="slant-img relative aspect-[4/5]">
                <Image
                  src={workImage.src}
                  alt={workImage.alt}
                  fill
                  sizes="(min-width: 1024px) 35vw, 100vw"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
            </figure>
          ) : null}
        </div>
      </Section>

      {/* ============ 6 · Markus / Geschäftsführer ============ */}
      <Section aria-labelledby="ceo-h">
        <div className="site-container">
          <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[auto_1fr]">
            <div className="justify-self-center">
              {ceoImage ? (
                <div className="slant-img relative h-44 w-44 md:h-56 md:w-56">
                  <Image src={ceoImage.src} alt={ceoImage.alt} fill sizes="14rem" className="object-cover" loading="lazy" />
                </div>
              ) : (
                <div
                  aria-hidden="true"
                  className="slant-img flex h-44 w-44 items-center justify-center bg-brand font-display text-5xl font-extrabold text-white md:h-56 md:w-56"
                >
                  {initials(fText(content, "ceo", "name"))}
                </div>
              )}
            </div>
            <div>
              <h2 id="ceo-h" className="sr-only">
                Statement der Geschäftsführung
              </h2>
              <p className="font-display text-2xl font-bold leading-snug text-ink md:text-[1.75rem]">
                „{fText(content, "ceo", "statement")}“
              </p>
              <p className="mt-5 text-[0.95rem]">
                <span className="font-semibold text-ink">{fText(content, "ceo", "name")}</span>
                <span className="text-ink-mute"> · {fText(content, "ceo", "role")}</span>
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ============ 7 · Aktuelle Jobs ============ */}
      {jobs.length > 0 ? (
        <Section tone="warm" aria-labelledby="jobs-h">
          <div className="site-container">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow={fText(content, "jobsTeaser", "eyebrow")}
                title={fText(content, "jobsTeaser", "title")}
              />
              <ButtonLink href="/jobs" variant="ghost" className="mb-1">
                Alle Jobs
                <ArrowIcon />
              </ButtonLink>
            </div>
            <ul className="mt-8 border-t border-line">
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      {/* ============ 8 · Echte PoS-Welt ============ */}
      {gallery.length > 0 ? (
        <Section aria-labelledby="gallery-h">
          <div className="site-container">
            <SectionHeading
              eyebrow={fText(content, "gallery", "eyebrow")}
              title={fText(content, "gallery", "title")}
            />
            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-12 md:gap-5">
              {gallery.slice(0, 4).map((img, i) => (
                <figure
                  key={img.src}
                  className={
                    [
                      "relative col-span-2 aspect-[16/10] md:col-span-7",
                      "relative aspect-[4/5] md:col-span-5 md:mt-10",
                      "relative aspect-[4/5] md:col-span-5 md:-mt-10",
                      "relative col-span-2 aspect-[16/10] md:col-span-7",
                    ][i]
                  }
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                    loading="lazy"
                  />
                </figure>
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      {/* ============ 9 · Kontakt ============ */}
      <Section tone="ink" className="slant-t" aria-labelledby="contact-h">
        <div className="site-container grid gap-10 md:grid-cols-12 md:items-center">
          <div className="md:col-span-6">
            <Eyebrow light>Kontakt</Eyebrow>
            <h2 id="contact-h" className="mt-4 text-3xl text-white md:text-4xl">
              Wir sind gut erreichbar. Versprochen.
            </h2>
            <p className="mt-4 max-w-md text-white/70">
              {hours.label} – telefonisch, per WhatsApp, im Chat oder per E-Mail. Und wer vorbeikommen
              möchte: {address.street}, {address.zip} {address.city}.
            </p>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <ul className="divide-y divide-white/10 border-y border-white/10">
              <li>
                <a href={telLink(phone)} className="group flex items-center justify-between py-4 text-white transition-colors hover:text-accent">
                  <span className="font-semibold">Anrufen</span>
                  <span className="text-white/60 group-hover:text-accent">{phone}</span>
                </a>
              </li>
              <li>
                <a href={waLink(waNumber, waTextBewerber)} rel="noopener" className="group flex items-center justify-between py-4 text-white transition-colors hover:text-accent">
                  <span className="font-semibold">WhatsApp</span>
                  <span className="text-white/60 group-hover:text-accent">Nachricht schreiben</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${email}`} className="group flex items-center justify-between py-4 text-white transition-colors hover:text-accent">
                  <span className="font-semibold">E-Mail</span>
                  <span className="text-white/60 group-hover:text-accent">{email}</span>
                </a>
              </li>
              <li className="flex items-center justify-between py-4 text-white">
                <span className="font-semibold">Live-Chat</span>
                <span className="text-white/60">unten rechts auf dieser Seite</span>
              </li>
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}

function ServiceBlock({
  number,
  title,
  text,
  bullets,
  image,
  imageSide,
}: {
  number: string;
  title: string;
  text: string;
  bullets: string[];
  image: { src: string; alt: string } | null;
  imageSide: "left" | "right";
}) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-12 md:gap-6">
      <div className={imageSide === "right" ? "md:col-span-6 lg:col-span-5" : "md:order-2 md:col-span-6 lg:col-span-5 lg:col-start-8"}>
        <span className="block-number">{number}</span>
        <h3 className="mt-2 text-2xl md:text-[1.7rem]">{title}</h3>
        <p className="mt-4">{text}</p>
        <CheckList className="mt-5" items={bullets} />
      </div>
      {image ? (
        <figure
          className={
            imageSide === "right"
              ? "md:col-span-6 md:col-start-7 lg:col-span-6"
              : "md:order-1 md:col-span-6 lg:col-span-6"
          }
        >
          <div className="slant-img relative aspect-[16/11]">
            <Image src={image.src} alt={image.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" loading="lazy" />
          </div>
        </figure>
      ) : null}
    </div>
  );
}
