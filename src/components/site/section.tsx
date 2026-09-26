import { cn } from "@/lib/utils";

export function Section({
  children,
  className,
  tone = "paper",
  ...props
}: React.ComponentPropsWithoutRef<"section"> & { tone?: "paper" | "warm" | "ink" | "brand" }) {
  const tones = {
    paper: "bg-paper",
    warm: "bg-paper-warm",
    ink: "bg-ink text-white/85",
    brand: "bg-brand text-white",
  } as const;
  return (
    <section className={cn("py-16 md:py-24", tones[tone], className)} {...props}>
      {children}
    </section>
  );
}

export function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <p className={cn("eyebrow", light && "eyebrow--light")}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  light = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  light?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow ? <Eyebrow light={light}>{eyebrow}</Eyebrow> : null}
      <h2 className={cn("mt-4 text-3xl md:text-4xl", light && "text-white")}>{title}</h2>
      {intro ? <p className={cn("mt-4 text-lg", light ? "text-white/70" : "text-ink-soft")}>{intro}</p> : null}
    </div>
  );
}

/** Checkliste mit Marken-Häkchen (kein Icon-Zirkus, ein konsistentes Zeichen). */
export function CheckList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <svg viewBox="0 0 20 20" className="mt-1 h-4.5 w-4.5 shrink-0 text-brand" fill="none" aria-hidden="true">
            <path d="M3.5 10.5 8 15l8.5-9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
