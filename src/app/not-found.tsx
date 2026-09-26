import Link from "next/link";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { Section, Eyebrow } from "@/components/site/section";
import { ButtonLink, ArrowIcon } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <a href="#inhalt" className="skip-link">
        Zum Inhalt springen
      </a>
      <SiteHeader />
      <main id="inhalt">
        <Section>
          <div className="site-container max-w-2xl">
            <Eyebrow>Fehler 404</Eyebrow>
            <h1 className="mt-4 text-4xl md:text-5xl">
              Diese Seite ist gerade nicht am Platz.
            </h1>
            <p className="mt-4 text-lg">
              Kommt vor – auch bei uns im Markt steht mal ein Aufsteller woanders. Was Du hier
              wahrscheinlich gesucht hast:
            </p>
            <ul className="mt-8 space-y-3">
              <li>
                <Link href="/jobs" className="prose-link text-lg">
                  Offene Stellen &amp; Jobs
                </Link>
              </li>
              <li>
                <Link href="/fuer-unternehmen" className="prose-link text-lg">
                  Leistungen für Unternehmen
                </Link>
              </li>
              <li>
                <Link href="/kontakt" className="prose-link text-lg">
                  Kontakt zum Innendienst
                </Link>
              </li>
            </ul>
            <div className="mt-9">
              <ButtonLink href="/" size="lg">
                Zur Startseite
                <ArrowIcon />
              </ButtonLink>
            </div>
          </div>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
