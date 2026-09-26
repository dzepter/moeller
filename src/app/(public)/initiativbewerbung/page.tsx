import type { Metadata } from "next";
import { getPublishedContent, fText } from "@/server/cms";
import { getSetting } from "@/lib/settings";
import { Section, Eyebrow } from "@/components/site/section";
import { ApplicationForm } from "@/components/site/application-form";

export const metadata: Metadata = {
  title: "Initiativbewerbung",
  description:
    "Bewirb Dich initiativ bei der Möller GmbH – ohne Anschreiben, ohne Konto, in 2 Minuten. Wir melden uns persönlich bei Dir.",
};

export default async function InitiativPage() {
  const [content, consentText] = await Promise.all([
    getPublishedContent("initiativbewerbung"),
    getSetting("applications.consentText"),
  ]);

  return (
    <>
      <Section className="pb-10">
        <div className="site-container max-w-3xl">
          <Eyebrow>Initiativbewerbung</Eyebrow>
          <h1 className="mt-4 text-4xl md:text-5xl">{fText(content, "hero", "headline")}</h1>
          <p className="mt-4 text-lg">{fText(content, "hero", "intro")}</p>
        </div>
      </Section>
      <Section tone="warm" className="pt-12">
        <div className="site-container max-w-3xl">
          <ApplicationForm askOwnCar consentText={consentText} />
        </div>
      </Section>
    </>
  );
}
