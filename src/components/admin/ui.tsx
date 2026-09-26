import { cn } from "@/lib/utils";
import Link from "next/link";

/** Gemeinsame Admin-UI-Bausteine: nüchtern, dicht, klar. */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        {description ? <p className="mt-1 text-[0.95rem] text-ink-mute">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("border border-line bg-white", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
          <h2 className="font-display text-[0.95rem] font-bold text-ink">{title}</h2>
          {actions}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

const badgeTones = {
  neutral: "bg-paper-warm text-ink-soft border-line",
  blue: "bg-brand-wash text-brand-deep border-brand/30",
  green: "bg-positive-wash text-positive border-positive/30",
  red: "bg-danger-wash text-danger border-danger/30",
  yellow: "bg-warn-wash text-[#8a5a12] border-accent/40",
  ink: "bg-ink text-white border-ink",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeTones; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-[2px] border px-2 py-0.5 text-xs font-semibold", badgeTones[tone])}>
      {children}
    </span>
  );
}

export function Table({ head, children, className }: { head: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto border border-line bg-white", className)}>
      <table className="w-full min-w-[40rem] border-collapse text-[0.9rem]">
        <thead>
          <tr className="border-b border-line bg-paper-warm text-left text-xs uppercase tracking-wide text-ink-mute">
            {head}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("px-3.5 py-2.5 font-semibold", className)}>{children}</th>;
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-3.5 py-2.5 align-middle", className)}>{children}</td>;
}

export function TrLink({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("border-b border-line-soft transition-colors last:border-b-0 hover:bg-brand-wash/40", className)}>{children}</tr>;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-line bg-paper-warm/50 px-6 py-12 text-center">
      <p className="font-display font-bold text-ink">{title}</p>
      {hint ? <p className="mx-auto mt-1.5 max-w-md text-[0.9rem] text-ink-mute">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, href, tone }: { label: string; value: string | number; href?: string; tone?: "default" | "alert" }) {
  const inner = (
    <div className={cn("border bg-white p-4 transition-colors", tone === "alert" && Number(value) > 0 ? "border-accent bg-warn-wash" : "border-line", href && "hover:border-brand")}>
      <p className="font-display text-2xl font-extrabold text-ink">{value}</p>
      <p className="mt-0.5 text-[0.85rem] text-ink-mute">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export const inputCls =
  "w-full rounded-[2px] border-[1.5px] border-line bg-white px-3 py-2 text-[0.95rem] text-ink placeholder:text-ink-mute focus:border-brand focus:outline-none disabled:bg-paper-warm";

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[0.85rem] font-semibold text-ink">
      {children}
    </label>
  );
}

export function FormRow({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  return <div className={cn("grid gap-4", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-3")}>{children}</div>;
}
