import type { Metadata } from "next";
import { getPublishedContent, fText } from "@/server/cms";
import { getSetting } from "@/lib/settings";
import { Section, Eyebrow } from "@/components/site/section";
import { ReferralTabs } from "@/components/site/referral-forms";

export const metadata: Metadata = {
  title: "Mitarbeiter empfehlen",
  description:
    "Du arbeitest für Möller und kennst jemanden, der gut zu uns passt? Empfiehl uns neue Kollegen – per persönlichem Empfehlungslink oder direkt mit Einverständnis.",
};

export default async function EmpfehlenPage() {
  const [content, consentText] = await Promise.all([
    getPublishedContent("empfehlen"),
    getSetting("referrals.consentText"),
  ]);

  return (
    <>
      <Section className="pb-10">
        <div className="site-container max-w-3xl">
          <Eyebrow>{fText(content, "hero", "eyebrow")}</Eyebrow>
          <h1 className="mt-4 text-4xl md:text-5xl">{fText(content, "hero", "headline")}</h1>
          <p className="mt-4 text-lg">{fText(content, "hero", "intro")}</p>
        </div>
      </Section>
      <Section tone="warm" className="pt-12">
        <div className="site-container max-w-3xl">
          <ReferralTabs consentText={consentText} />
        </div>
      </Section>
    </>
  );
}
