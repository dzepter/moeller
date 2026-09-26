import Image from "next/image";
import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { waLink } from "@/components/site/contact-links";

export async function SiteFooter() {
  const [phone, email, address, hours, waNumber, waText] = await Promise.all([
    getSetting("contact.phone"),
    getSetting("contact.email"),
    getSetting("contact.address"),
    getSetting("contact.openingHours"),
    getSetting("contact.whatsappNumber"),
    getSetting("whatsapp.text.allgemein"),
  ]);

  return (
    <footer className="bg-ink text-white/80">
      <div className="site-container grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:gap-8 md:py-16">
        <div>
          <Image
            src="/brand/moeller-logo-white.png"
            alt="Möller GmbH – Beratungs- & Vertriebsgesellschaft"
            width={969}
            height={397}
            className="h-11 w-auto"
          />
          <p className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-white/60">
            Seit über 15 Jahren als Möller GmbH: Promotion, Vertrieb und dauerhafte Betreuung am
            Point of Sale – mit über 25 Jahren Branchenerfahrung.
          </p>
        </div>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.08em] text-white">
            Kontakt
          </h2>
          <address className="mt-4 space-y-2 text-[0.95rem] not-italic leading-relaxed">
            <p>
              {address.company}
              <br />
              {address.street}
              <br />
              {address.zip} {address.city}
            </p>
            <p>
              <a href={`tel:+49${phone.replace(/\D/g, "").replace(/^0/, "")}`} className="hover:text-white">
                Telefon {phone}
              </a>
              <br />
              <a href={`mailto:${email}`} className="hover:text-white">
                {email}
              </a>
              <br />
              <a href={waLink(waNumber, waText)} className="hover:text-white" rel="noopener">
                WhatsApp schreiben
              </a>
            </p>
            <p className="text-white/60">{hours.label}</p>
          </address>
        </div>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.08em] text-white">
            Schnell zum Ziel
          </h2>
          <ul className="mt-4 space-y-2 text-[0.95rem]">
            <li><Link href="/jobs" className="hover:text-white">Offene Stellen</Link></li>
            <li><Link href="/initiativbewerbung" className="hover:text-white">Initiativbewerbung</Link></li>
            <li><Link href="/empfehlen" className="hover:text-white">Mitarbeiter empfehlen</Link></li>
            <li><Link href="/fuer-unternehmen" className="hover:text-white">Leistungen für Unternehmen</Link></li>
            <li><Link href="/kontakt" className="hover:text-white">Kontakt</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="site-container flex flex-col gap-3 py-5 text-sm text-white/50 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Möller GmbH · Beratungs- &amp; Vertriebsgesellschaft</p>
          <ul className="flex gap-6">
            <li><Link href="/impressum" className="hover:text-white">Impressum</Link></li>
            <li><Link href="/datenschutz" className="hover:text-white">Datenschutz</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
