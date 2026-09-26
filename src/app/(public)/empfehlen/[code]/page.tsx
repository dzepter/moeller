import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReferralByCode } from "@/server/referrals";
import { Section, Eyebrow } from "@/components/site/section";
import { ReferralSelfForm } from "@/components/site/referral-forms";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Persönliche Empfehlung",
  robots: { index: false, follow: false },
};

export default async function ReferralCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[A-Z0-9]{4,20}$/i.test(code)) notFound();
  const referral = await getReferralByCode(code);
  if (!referral || referral.type !== "LINK") notFound();

  const alreadyUsed = Boolean(referral.referredFirstName);

  return (
    <>
      <Section className="pb-10">
        <div className="site-container max-w-3xl">
          <Eyebrow>Persönliche Empfehlung</Eyebrow>
          <h1 className="mt-4 text-4xl md:text-5xl">
            {alreadyUsed ? "Dieser Link wurde bereits genutzt." : `${referral.referrerFirstName} empfiehlt Dir Möller.`}
          </h1>
          {alreadyUsed ? (
            <>
              <p className="mt-4 text-lg">
                Über diesen Empfehlungslink wurde schon eine Kontaktaufnahme eingetragen. Wenn Du das
                warst: Wir melden uns! Falls nicht, schau Dir gern unsere offenen Stellen an.
              </p>
              <div className="mt-8 flex flex-wrap gap-3.5">
                <ButtonLink href="/jobs">Offene Stellen</ButtonLink>
                <ButtonLink href="/initiativbewerbung" variant="outline">
                  Initiativbewerbung
                </ButtonLink>
              </div>
            </>
          ) : (
            <p className="mt-4 text-lg">
              Wir sind die Möller GmbH – eine Beratungs- und Vertriebsgesellschaft mit über 25 Jahren
              Branchenerfahrung und langfristigen Projekten im Handel. Quereinsteiger willkommen,
              gründliche Einarbeitung inklusive.
            </p>
          )}
        </div>
      </Section>
      {!alreadyUsed ? (
        <Section tone="warm" className="pt-12">
          <div className="site-container max-w-3xl">
            <ReferralSelfForm code={code.toUpperCase()} referrerFirstName={referral.referrerFirstName} />
          </div>
        </Section>
      ) : null}
    </>
  );
}
