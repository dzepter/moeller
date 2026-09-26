"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; exact?: boolean };

export function AdminNav({
  items,
  userName,
  userInitials,
  logout,
}: {
  items: NavItem[];
  userName: string;
  userInitials: string;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const nav = (
    <nav aria-label="Adminbereich" className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-[2px] px-3 py-2 text-[0.9rem] font-medium transition-colors",
                  active ? "bg-brand text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const userBox = (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-2.5 px-1">
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center bg-brand font-display text-xs font-bold text-white">
          {userInitials}
        </span>
        <span className="truncate text-sm text-white/85">{userName}</span>
      </div>
      <form action={logout} className="mt-2.5">
        <button type="submit" className="w-full rounded-[2px] border border-white/20 px-3 py-1.5 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white">
          Abmelden
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Mobile Top-Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-ink px-4 py-3 lg:hidden">
        <Link href="/admin" className="flex items-center">
          <Image src="/brand/moeller-logo-white.png" alt="Möller Intern" width={969} height={397} className="h-7 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-nav-mobile"
          className="flex h-10 w-10 items-center justify-center text-white"
        >
          <span className="sr-only">{open ? "Menü schließen" : "Menü öffnen"}</span>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />}
          </svg>
        </button>
      </header>
      {open ? (
        <div id="admin-nav-mobile" className="fixed inset-x-0 bottom-0 top-[3.75rem] z-40 flex flex-col bg-ink lg:hidden">
          {nav}
          {userBox}
        </div>
      ) : null}

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-ink lg:flex">
        <div className="px-5 pb-2 pt-5">
          <Link href="/admin" className="inline-flex">
            <Image src="/brand/moeller-logo-white.png" alt="Möller Intern" width={969} height={397} className="h-8 w-auto" />
          </Link>
          <p className="mt-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white/40">Interner Bereich</p>
        </div>
        {nav}
        {userBox}
      </aside>
    </>
  );
}
