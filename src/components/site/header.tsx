"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

const NAV = [
  { href: "/fuer-unternehmen", label: "Für Unternehmen" },
  { href: "/arbeiten-bei-moeller", label: "Arbeiten bei Möller" },
  { href: "/jobs", label: "Jobs" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line-soft bg-white/95 backdrop-blur-sm">
      <div className="site-container flex h-16 items-center justify-between gap-6 md:h-[4.5rem]">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Möller GmbH – Startseite">
          <Image
            src="/brand/moeller-logo-brand.png"
            alt="Möller GmbH – Beratungs- & Vertriebsgesellschaft"
            width={969}
            height={397}
            priority
            className="h-9 w-auto md:h-10"
          />
        </Link>

        <nav aria-label="Hauptnavigation" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative py-2 text-[0.95rem] font-medium text-ink-soft transition-colors hover:text-ink",
                      "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-brand after:transition-transform after:duration-200",
                      "hover:after:scale-x-100",
                      active && "text-ink after:scale-x-100",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden lg:block">
          <ButtonLink href="/jobs" size="md">
            Jetzt bewerben
          </ButtonLink>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="-mr-1 flex h-11 w-11 items-center justify-center text-ink lg:hidden"
        >
          <span className="sr-only">{open ? "Menü schließen" : "Menü öffnen"}</span>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />}
          </svg>
        </button>
      </div>

      {/* Mobile Navigation */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-line-soft bg-white lg:hidden"
      >
        <nav aria-label="Hauptnavigation mobil" className="site-container py-4">
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.href} className="border-b border-line-soft last:border-b-0">
                <Link
                  href={item.href}
                  className="block py-3.5 text-[1.05rem] font-medium text-ink"
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="pt-4">
            <ButtonLink href="/jobs" className="w-full" size="lg">
              Jetzt bewerben
            </ButtonLink>
          </div>
        </nav>
      </div>
    </header>
  );
}
