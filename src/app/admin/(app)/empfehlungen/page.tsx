import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { PageHeader, Table, Th, Td, TrLink, Badge, EmptyState, inputCls } from "@/components/admin/ui";
import { REFERRAL_STATUS_LABEL } from "@/components/admin/status";
import { BUNDESLAND_KURZ, ALL_BUNDESLAENDER, BUNDESLAND_LABEL, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Bundesland, ReferralStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Empfehlungen" };

const STATUS_TONE: Record<string, "blue" | "yellow" | "neutral" | "green" | "red" | "ink"> = {
  EMPFEHLUNG_NEU: "blue",
  KONTAKT_AUSSTEHEND: "yellow",
  KONTAKTIERT: "ink",
  INTERESSE: "green",
  KEIN_INTERESSE: "red",
  IN_BEWERBUNG_UEBERNOMMEN: "green",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EmpfehlungenPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("referrals.manage");
  const params = await searchParams;
  const get = (k: string) => (typeof params[k] === "string" && params[k] ? (params[k] as string) : undefined);

  const status = Object.keys(REFERRAL_STATUS_LABEL).includes(get("status") ?? "") ? (get("status") as ReferralStatus) : undefined;
  const bundesland = ALL_BUNDESLAENDER.includes(get("bundesland") as Bundesland) ? (get("bundesland") as Bundesland) : undefined;
  const q = get("q");

  const referrals = await db.referral.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(bundesland ? { referredBundesland: bundesland } : {}),
      ...(q
        ? {
            OR: [
              { referrerFirstName: { contains: q, mode: "insensitive" } },
              { referrerLastName: { contains: q, mode: "insensitive" } },
              { referredFirstName: { contains: q, mode: "insensitive" } },
              { referredLastName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      anonymizedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader title="Mitarbeiterempfehlungen" description="Empfehlungen prüfen, kontaktieren und in Bewerbungen übernehmen." />

      <form method="get" className="mb-4 grid gap-3 border border-line bg-white p-4 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Suche</span>
          <input type="text" name="q" defaultValue={q ?? ""} placeholder="Name (Empfehlende/Empfohlene)" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Status</span>
          <select name="status" defaultValue={status ?? ""} className={inputCls}>
            <option value="">Alle</option>
            {Object.entries(REFERRAL_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Bundesland</span>
          <select name="bundesland" defaultValue={bundesland ?? ""} className={inputCls}>
            <option value="">Alle</option>
            {ALL_BUNDESLAENDER.map((bl) => (
              <option key={bl} value={bl}>
                {BUNDESLAND_LABEL[bl]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" size="sm">
            Filtern
          </Button>
        </div>
      </form>

      {referrals.length ? (
        <Table
          head={
            <>
              <Th>Empfohlene Person</Th>
              <Th>Empfohlen von</Th>
              <Th>Region</Th>
              <Th>Weg</Th>
              <Th>Status</Th>
              <Th>Eingang</Th>
            </>
          }
        >
          {referrals.map((r) => (
            <TrLink key={r.id}>
              <Td className="font-semibold text-ink">
                <Link href={`/admin/empfehlungen/${r.id}`} className="hover:text-brand">
                  {r.referredFirstName ? `${r.referredFirstName} ${r.referredLastName}` : "– wartet auf Selbsteintrag –"}
                </Link>
              </Td>
              <Td>
                {r.referrerFirstName} {r.referrerLastName}
              </Td>
              <Td>{r.referredBundesland ? BUNDESLAND_KURZ[r.referredBundesland] : "–"}</Td>
              <Td>{r.type === "LINK" ? "Empfehlungslink" : "Direkt"}</Td>
              <Td>
                <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{REFERRAL_STATUS_LABEL[r.status]}</Badge>
              </Td>
              <Td className="whitespace-nowrap">{formatDate(r.createdAt)}</Td>
            </TrLink>
          ))}
        </Table>
      ) : (
        <EmptyState title="Keine Empfehlungen gefunden" hint="Neue Empfehlungen von der Website erscheinen hier automatisch." />
      )}
    </>
  );
}
