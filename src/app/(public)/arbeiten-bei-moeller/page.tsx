import type { Metadata } from "next";
import Image from "next/image";
import { getPublishedContent, fText, fPairs, fList, fImage } from "@/server/cms";
import { Section, Eyebrow, SectionHeading, CheckList } from "@/components/site/section";
import { RichText } from "@/components/site/richtext";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Arbeiten bei Möller – Dein Einstieg",
  description:
    "Gute Einarbeitung, direkte Ansprechpartner, langfristige Projekte: So arbeitest Du bei der Möller GmbH. Quereinsteiger ausdrücklich willkommen – bewirb Dich in 2 Minuten.",
};

export default async function ArbeitenPage() {
  const content = await getPublishedContent("arbeiten-bei-moeller");
  const heroImage = fImage(content, "hero", "image");
  const einarbeitungImage = fImage(content, "einarbeitung", "image");
  const benefits = fPairs(content, "benefits", "items");

  return (
    <>
      <Section className="pb-12">
        <div className="site-container grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Eyebrow>{fText(content, "hero", "eyebrow")}</Eyebrow>
            <h1 className="mt-4 text-4xl md:text-5xl">{fText(content, "hero", "headline")}</h1>
            <p className="mt-5 max-w-xl text-lg">{fText(content, "hero", "intro")}</p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <ButtonLink href="/jobs" size="lg">
                Offene Stellen ansehen
                <ArrowIcon />
              </ButtonLink>
              <ButtonLink href="/initiativbewerbung" variant="outline" size="lg">
                Initiativbewerbung
              </ButtonLink>
            </div>
          </div>
          {heroImage ? (
            <figure className="lg:col-span-5">
              <div className="slant-img relative aspect-[4/3]">
                <Image src={heroImage.src} alt={heroImage.alt} fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
              </div>
            </figure>
          ) : null}
        </div>
      </Section>

      <Section tone="warm">
        <div className="site-container">
          <SectionHeading title={fText(content, "benefits", "title")} />
          <dl className="mt-10 grid gap-x-10 gap-y-0 md:grid-cols-2">
            {benefits.map((b, i) => (
              <div key={b.a} className="grid grid-cols-[auto_1fr] gap-5 border-t border-line py-6">
                <span className="block-number pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <dt className="font-display text-xl font-bold text-ink">{b.a}</dt>
                  <dd className="mt-1.5 text-[0.95rem]">{b.b}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section>
        <div className="site-container grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h2 className="text-3xl">{fText(content, "quereinstieg", "title")}</h2>
            <RichText className="mt-5" text={fText(content, "quereinstieg", "body")} />
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <h2 className="text-3xl">{fText(content, "eigenschaften", "title")}</h2>
            <CheckList className="mt-6" items={fList(content, "eigenschaften", "items")} />
            <p className="mt-5 border-l-2 border-accent bg-warn-wash p-4 text-[0.95rem]">
              {fText(content, "eigenschaften", "note")}
            </p>
          </div>
        </div>
      </Section>

      <Section tone="warm">
        <div className="site-container grid items-center gap-10 lg:grid-cols-12">
          {einarbeitungImage ? (
            <figure className="lg:col-span-6">
              <div className="slant-img relative aspect-[16/11]">
                <Image src={einarbeitungImage.src} alt={einarbeitungImage.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" loading="lazy" />
              </div>
            </figure>
          ) : null}
          <div className="lg:col-span-5 lg:col-start-8">
            <h2 className="text-3xl">{fText(content, "einarbeitung", "title")}</h2>
            <p className="mt-4">{fText(content, "einarbeitung", "text")}</p>
          </div>
        </div>
      </Section>

      <Section tone="brand" className="slant-t">
        <div className="site-container flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl text-white">{fText(content, "cta", "title")}</h2>
            <p className="mt-2 max-w-lg text-white/80">{fText(content, "cta", "text")}</p>
          </div>
          <div className="flex flex-wrap gap-3.5">
            <ButtonLink href="/jobs" variant="light" size="lg">
              Jobs entdecken
              <ArrowIcon />
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
