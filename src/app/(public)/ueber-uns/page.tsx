import type { Metadata } from "next";
import Image from "next/image";
import { getPublishedContent, fText, fPairs, fImage } from "@/server/cms";
import { getSetting } from "@/lib/settings";
import { db } from "@/lib/db";
import { Section, Eyebrow, SectionHeading } from "@/components/site/section";
import { RichText } from "@/components/site/richtext";
import { BUNDESLAND_LABEL, initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Über uns",
  description:
    "Die Möller GmbH aus Gau-Algesheim: Beratungs- & Vertriebsgesellschaft mit über 25 Jahren Branchenerfahrung – Promotion, Vertrieb und PoS-Betreuung in vier Bundesländern.",
};

export default async function UeberUnsPage() {
  const [content, teamEnabled] = await Promise.all([
    getPublishedContent("ueber-uns"),
    getSetting("features.teamSection"),
  ]);
  const team = teamEnabled
    ? await db.teamMember.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } })
    : [];

  const heroImage = fImage(content, "hero", "image");
  const ceoImage = fImage(content, "ceo", "image");
  const values = fPairs(content, "values", "items");

  return (
    <>
      <Section className="pb-12">
        <div className="site-container grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Eyebrow>{fText(content, "hero", "eyebrow")}</Eyebrow>
            <h1 className="mt-4 text-4xl md:text-5xl">{fText(content, "hero", "headline")}</h1>
            <p className="mt-5 max-w-xl text-lg">{fText(content, "hero", "intro")}</p>
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
        <div className="site-container grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h2 className="text-3xl">{fText(content, "story", "title")}</h2>
            <RichText className="mt-5" text={fText(content, "story", "body")} />
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <h2 className="text-3xl">{fText(content, "values", "title")}</h2>
            <dl className="mt-6 space-y-5">
              {values.map((v) => (
                <div key={v.a} className="border-l-2 border-brand pl-4">
                  <dt className="font-display font-bold text-ink">{v.a}</dt>
                  <dd className="mt-1 text-[0.95rem]">{v.b}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      <Section>
        <div className="site-container">
          <SectionHeading title={fText(content, "regions", "title")} intro={fText(content, "regions", "text")} />
          <ul className="mt-8 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line md:grid-cols-4">
            {(Object.keys(BUNDESLAND_LABEL) as Array<keyof typeof BUNDESLAND_LABEL>).map((bl) => (
              <li key={bl} className="bg-white p-6">
                <span className="block-number">{bl === "NRW" ? "NW" : bl.slice(0, 2)}</span>
                <p className="mt-1 font-display font-bold text-ink">{BUNDESLAND_LABEL[bl]}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Geschäftsführung */}
      <Section tone="ink" className="slant-t slant-b">
        <div className="site-container">
          <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[auto_1fr]">
            <div className="justify-self-center">
              {ceoImage ? (
                <div className="slant-img relative h-48 w-48 md:h-60 md:w-60">
                  <Image src={ceoImage.src} alt={ceoImage.alt} fill sizes="15rem" className="object-cover" loading="lazy" />
                </div>
              ) : (
                <div aria-hidden="true" className="slant-img flex h-48 w-48 items-center justify-center bg-brand font-display text-5xl font-extrabold text-white md:h-60 md:w-60">
                  {initials(fText(content, "ceo", "name"))}
                </div>
              )}
            </div>
            <div>
              <p className="font-display text-2xl font-bold leading-snug text-white md:text-[1.75rem]">
                „{fText(content, "ceo", "statement")}“
              </p>
              <p className="mt-5 text-[0.95rem] text-white/70">
                <span className="font-semibold text-white">{fText(content, "ceo", "name")}</span> ·{" "}
                {fText(content, "ceo", "role")}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Team (optional aktivierbar) */}
      {teamEnabled && team.length > 0 ? (
        <Section aria-labelledby="team-h">
          <div className="site-container">
            <SectionHeading
              eyebrow={fText(content, "team", "eyebrow")}
              title={fText(content, "team", "title")}
              intro={fText(content, "team", "intro")}
            />
            <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((member) => (
                <li key={member.id} className="border-t-2 border-brand pt-5">
                  <div aria-hidden="true" className="flex h-20 w-20 items-center justify-center bg-paper-warm font-display text-2xl font-extrabold text-brand">
                    {initials(member.name)}
                  </div>
                  <h3 className="mt-4 text-xl">{member.name}</h3>
                  <p className="text-[0.95rem] font-semibold text-brand">{member.role}</p>
                  {member.bio ? <p className="mt-2 text-[0.95rem]">{member.bio}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}
    </>
  );
}
