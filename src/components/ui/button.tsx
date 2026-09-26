import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

type Variant = "primary" | "outline" | "ghost" | "light" | "danger";
type Size = "md" | "lg" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[2px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-deep",
  outline: "border-[1.5px] border-ink text-ink hover:bg-ink hover:text-white",
  ghost: "text-brand hover:text-brand-deep hover:bg-brand-wash",
  light: "bg-white text-ink hover:bg-paper-warm",
  danger: "bg-danger text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "text-sm px-3.5 py-1.5",
  md: "text-[0.95rem] px-5 py-2.5",
  lg: "text-base px-6 py-3",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  ...props
}: ComponentPropsWithoutRef<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

/** Pfeil-Detail für Primär-CTAs */
export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4", className)} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 8h11M9 3.5 13.5 8 9 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
