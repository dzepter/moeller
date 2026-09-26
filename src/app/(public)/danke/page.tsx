import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/site/section";
import { ButtonLink } from "@/components/ui/button";
import { getSetting } from "@/lib/settings";
import { telLink, waLink } from "@/components/site/contact-links";

export const metadata: Metadata = {
  title: "Danke für Deine Bewerbung",
  robots: { index: false, follow: true },
};

export default async function DankePage() {
  const [phone, hours, waNumber, waText] = await Promise.all([
    getSetting("contact.phone"),
    getSetting("contact.openingHours"),
    getSetting("contact.whatsappNumber"),
    getSetting("whatsapp.text.bewerber"),
  ]);

  return (
    <Section>
      <div className="site-container max-w-2xl">
        <Eyebrow>Bewerbung eingegangen</Eyebrow>
        <h1 className="mt-4 text-4xl md:text-5xl">Danke Dir – das war’s schon!</h1>
        <p className="mt-5 text-lg">
          Deine Bewerbung ist sicher bei uns angekommen. Du bekommst gleich eine kurze Bestätigung
          per E-Mail (schau zur Not auch im Spam-Ordner nach).
        </p>
        <div className="mt-8 border-l-2 border-brand bg-paper-warm p-5">
          <p className="font-semibold text-ink">So geht es weiter:</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-soft">
            <li>Unser Innendienst schaut sich Deine Angaben an.</li>
            <li>In der Regel melden wir uns innerhalb weniger Werktage telefonisch oder per E-Mail.</li>
            <li>Wenn es passt, lernen wir uns in einem lockeren Gespräch kennen.</li>
          </ol>
        </div>
        <p className="mt-6 text-ink-soft">
          Du hast vorab eine Frage? Ruf uns gern an ({hours.label}):{" "}
          <a href={telLink(phone)} className="prose-link">
            {phone}
          </a>{" "}
          – oder{" "}
          <a href={waLink(waNumber, waText)} rel="noopener" className="prose-link">
            schreib uns per WhatsApp
          </a>
          .
        </p>
        <div className="mt-9">
          <ButtonLink href="/" variant="outline">
            Zur Startseite
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
