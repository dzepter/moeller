import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = {
  title: { default: "Möller Academy", template: "%s – Möller Academy" },
  robots: { index: false, follow: false },
};

export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  const [phone, hours] = await Promise.all([getSetting("contact.phone"), getSetting("contact.openingHours")]);
  return (
    <div className="min-h-dvh bg-paper-warm">
      <a href="#inhalt" className="skip-link">
        Zum Inhalt springen
      </a>
      <header className="border-b border-line bg-ink">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/academy/kurs" className="flex items-center gap-3">
            <Image src="/brand/moeller-logo-white.png" alt="Möller GmbH" width={969} height={397} className="h-7 w-auto" />
            <span className="font-display text-sm font-bold uppercase tracking-[0.12em] text-white/70">Academy</span>
          </Link>
        </div>
      </header>
      <main id="inhalt" className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        {children}
      </main>
      <footer className="mx-auto max-w-3xl px-4 pb-8 text-center text-xs text-ink-mute">
        Fragen? Ruf uns an: {phone} ({hours.label}) · Möller GmbH
      </footer>
    </div>
  );
}
