import type { Metadata } from "next";
import { getPublishedContent, fText } from "@/server/cms";
import { Section, Eyebrow } from "@/components/site/section";
import { RichText } from "@/components/site/richtext";

export const metadata: Metadata = {
  title: "Impressum",
  robots: { index: true, follow: true },
};

export default async function ImpressumPage() {
  const content = await getPublishedContent("impressum");
  return (
    <Section>
      <div className="site-container max-w-2xl">
        <Eyebrow>Rechtliches</Eyebrow>
        <h1 className="mt-4 text-4xl">Impressum</h1>
        <RichText className="mt-8" text={fText(content, "inhalt", "body")} />
      </div>
    </Section>
  );
}
