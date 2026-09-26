import type { Metadata } from "next";
import Image from "next/image";
import { getPublishedContent, fText, fPairs, fList, fImage } from "@/server/cms";
import { getSetting } from "@/lib/settings";
import { Section, Eyebrow, SectionHeading, CheckList } from "@/components/site/section";
import { RichText } from "@/components/site/richtext";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";
import { telLink, waLink } from "@/components/site/contact-links";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Für Unternehmen – PoS-Betreuung, Promotion & Vertrieb",
  description:
    "Die Möller GmbH organisiert, steuert und betreut langfristige PoS-Projekte: geschulte Promotoren, digitale Einsatzplanung, Teamleiter vor Ort, Qualitätskontrolle und wöchentliches Reporting.",
};

export default async function FuerUnternehmenPage() {
  const [content, phone, email, waNumber, waText, address] = await Promise.all([
    getPublishedContent("fuer-unternehmen"),
    getSetting("contact.phone"),
    getSetting("contact.email"),
    getSetting("contact.whatsappNumber"),
    getSetting("whatsapp.text.unternehmen"),
    getSetting("contact.address"),
  ]);

  const heroImage = fImage(content, "hero", "image");
  const steuerungImage = fImage(content, "steuerung", "image");
  const leistungen = fPairs(content, "leistungen", "items");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Möller GmbH",
    legalName: "Möller GmbH Beratungs- & Vertriebsgesellschaft",
    url: env.baseUrl,
    telephone: "+496725919350",
    email,
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      postalCode: address.zip,
      addressLocality: address.city,
      addressCountry: "DE",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Section className="pb-12">
        <div className="site-container grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Eyebrow>{fText(content, "hero", "eyebrow")}</Eyebrow>
            <h1 className="mt-4 text-4xl md:text-5xl">{fText(content, "hero", "headline")}</h1>
            <p className="mt-5 max-w-xl text-lg">{fText(content, "hero", "intro")}</p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <ButtonLink href="#kontakt" size="lg">
                Projekt anfragen
                <ArrowIcon />
              </ButtonLink>
              <ButtonLink href={telLink(phone)} variant="outline" size="lg">
                {phone}
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
        <div className="site-container max-w-3xl">
          <h2 className="text-3xl">{fText(content, "promise", "title")}</h2>
          <RichText className="mt-5 text-lg" text={fText(content, "promise", "body")} />
        </div>
      </Section>

      <Section>
        <div className="site-container">
          <SectionHeading title={fText(content, "leistungen", "title")} intro={fText(content, "leistungen", "intro")} />
          <ol className="mt-10 grid gap-x-10 gap-y-0 md:grid-cols-2">
            {leistungen.map((item, i) => (
              <li key={item.a} className="grid grid-cols-[auto_1fr] gap-5 border-t border-line py-7">
                <span className="block-number pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-xl">{item.a}</h3>
                  <p className="mt-1.5 text-[0.95rem]">{item.b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section tone="warm">
        <div className="site-container grid items-center gap-10 lg:grid-cols-12">
          {steuerungImage ? (
            <figure className="lg:col-span-6">
              <div className="slant-img relative aspect-[16/11]">
                <Image src={steuerungImage.src} alt={steuerungImage.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" loading="lazy" />
              </div>
            </figure>
          ) : null}
          <div className="lg:col-span-5 lg:col-start-8">
            <h2 className="text-3xl">{fText(content, "steuerung", "title")}</h2>
            <p className="mt-4">{fText(content, "steuerung", "text")}</p>
            <CheckList className="mt-6" items={fList(content, "steuerung", "bullets")} />
          </div>
        </div>
      </Section>

      <Section tone="ink" id="kontakt" className="slant-t scroll-mt-20">
        <div className="site-container grid gap-10 md:grid-cols-12 md:items-center">
          <div className="md:col-span-6">
            <Eyebrow light>Kontakt für Unternehmen</Eyebrow>
            <h2 className="mt-4 text-3xl text-white md:text-4xl">{fText(content, "kontakt", "title")}</h2>
            <p className="mt-4 max-w-md text-white/70">{fText(content, "kontakt", "text")}</p>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <ul className="divide-y divide-white/10 border-y border-white/10">
              <li>
                <a href={telLink(phone)} className="group flex items-center justify-between py-4 text-white hover:text-accent">
                  <span className="font-semibold">Telefon</span>
                  <span className="text-white/60 group-hover:text-accent">{phone}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${email}`} className="group flex items-center justify-between py-4 text-white hover:text-accent">
                  <span className="font-semibold">E-Mail</span>
                  <span className="text-white/60 group-hover:text-accent">{email}</span>
                </a>
              </li>
              <li>
                <a href={waLink(waNumber, waText)} rel="noopener" className="group flex items-center justify-between py-4 text-white hover:text-accent">
                  <span className="font-semibold">WhatsApp</span>
                  <span className="text-white/60 group-hover:text-accent">Nachricht schreiben</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}
