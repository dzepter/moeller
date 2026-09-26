import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/site/section";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Danke für die Empfehlung",
  robots: { index: false, follow: true },
};

export default function ReferralDankePage() {
  return (
    <Section>
      <div className="site-container max-w-2xl">
        <Eyebrow>Empfehlung eingegangen</Eyebrow>
        <h1 className="mt-4 text-4xl md:text-5xl">Danke – das ist angekommen!</h1>
        <p className="mt-5 text-lg">
          Unser Innendienst meldet sich zeitnah und ganz unverbindlich. Gut zu wissen: Ein Anruf von
          uns ist noch keine Bewerbung – wir lernen uns erstmal locker kennen.
        </p>
        <div className="mt-9 flex flex-wrap gap-3.5">
          <ButtonLink href="/jobs">Offene Stellen ansehen</ButtonLink>
          <ButtonLink href="/" variant="outline">
            Zur Startseite
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
