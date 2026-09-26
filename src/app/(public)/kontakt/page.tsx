import type { Metadata } from "next";
import { getPublishedContent, fText } from "@/server/cms";
import { getSetting } from "@/lib/settings";
import { Section, Eyebrow } from "@/components/site/section";
import { telLink, waLink } from "@/components/site/contact-links";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "So erreichst Du die Möller GmbH: Telefon 06725 / 919350, WhatsApp, Live-Chat oder E-Mail – Montag bis Freitag von 08:00 bis 17:00 Uhr. Max-Planck-Str. 8, 55435 Gau-Algesheim.",
};

export default async function KontaktPage() {
  const [content, phone, email, applicationEmail, address, hours, waNumber, waTextAllg, waTextBewerber] =
    await Promise.all([
      getPublishedContent("kontakt"),
      getSetting("contact.phone"),
      getSetting("contact.email"),
      getSetting("contact.applicationEmail"),
      getSetting("contact.address"),
      getSetting("contact.openingHours"),
      getSetting("contact.whatsappNumber"),
      getSetting("whatsapp.text.allgemein"),
      getSetting("whatsapp.text.bewerber"),
    ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Möller GmbH",
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
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: hours.windows[0]?.from ?? "08:00",
      closes: hours.windows[hours.windows.length - 1]?.to ?? "17:00",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Section className="pb-10">
        <div className="site-container max-w-3xl">
          <Eyebrow>Kontakt</Eyebrow>
          <h1 className="mt-4 text-4xl md:text-5xl">{fText(content, "hero", "headline")}</h1>
          <p className="mt-4 text-lg">{fText(content, "hero", "intro")}</p>
        </div>
      </Section>

      <div className="site-container grid gap-10 pb-20 md:grid-cols-2 md:pb-28 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ul className="divide-y divide-line border-y border-line">
            <ContactRow label="Telefon" href={telLink(phone)} value={phone} note={hours.label} />
            <ContactRow
              label="WhatsApp"
              href={waLink(waNumber, waTextAllg)}
              value="Nachricht schreiben"
              note="Antwort in der Regel innerhalb der Bürozeiten"
            />
            <ContactRow label="E-Mail (allgemein)" href={`mailto:${email}`} value={email} />
            <ContactRow
              label="E-Mail (Bewerbungen)"
              href={`mailto:${applicationEmail}`}
              value={applicationEmail}
              note="Oder noch einfacher: das 2-Minuten-Formular auf jeder Stellenseite"
            />
            <li className="py-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-ink-mute">Live-Chat</p>
              <p className="mt-1 font-display text-lg font-bold text-ink">Unten rechts auf dieser Seite</p>
              <p className="mt-1 text-sm text-ink-mute">
                Während der Bürozeiten antworten wir meist in wenigen Minuten – sonst am nächsten Werktag.
              </p>
            </li>
          </ul>

          <p className="mt-6 text-sm text-ink-mute">
            Du interessierst Dich für eine Stelle? Dann nutz gern direkt{" "}
            <a href={waLink(waNumber, waTextBewerber)} rel="noopener" className="prose-link">
              WhatsApp mit vorbereiteter Nachricht
            </a>{" "}
            – ein „Hallo“ reicht uns.
          </p>
        </div>

        <aside className="lg:col-span-4 lg:col-start-9">
          <div className="border border-line bg-paper-warm p-6">
            <h2 className="text-xl">So findest Du uns</h2>
            <address className="mt-3 not-italic leading-relaxed text-ink-soft">
              {address.company}
              <br />
              {address.street}
              <br />
              {address.zip} {address.city}
            </address>
            <p className="mt-4 border-t border-line pt-4 text-sm text-ink-mute">{hours.label}</p>
          </div>
        </aside>
      </div>
    </>
  );
}

function ContactRow({ label, href, value, note }: { label: string; href: string; value: string; note?: string }) {
  return (
    <li>
      <a href={href} rel={href.startsWith("http") ? "noopener" : undefined} className="group block py-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-mute">{label}</p>
        <p className="mt-1 font-display text-lg font-bold text-ink transition-colors group-hover:text-brand">{value}</p>
        {note ? <p className="mt-1 text-sm text-ink-mute">{note}</p> : null}
      </a>
    </li>
  );
}
