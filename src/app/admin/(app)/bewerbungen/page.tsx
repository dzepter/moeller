import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, hasPermission } from "@/lib/rbac";
import { listApplications, type ApplicationListFilter } from "@/server/candidates";
import { PageHeader, Table, Th, Td, TrLink, Badge, EmptyState, inputCls } from "@/components/admin/ui";
import { statusLabel, statusTone, MANUAL_STATUS_LABEL } from "@/components/admin/status";
import { BUNDESLAND_KURZ, BUNDESLAND_LABEL, ALL_BUNDESLAENDER, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Bundesland, CandidateSource } from "@prisma/client";

export const metadata: Metadata = { title: "Bewerbungen" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BewerbungenPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const get = (k: string) => (typeof params[k] === "string" && params[k] ? (params[k] as string) : undefined);

  const filter: ApplicationListFilter = {
    status: get("status"),
    bundesland: ALL_BUNDESLAENDER.includes(get("bundesland") as Bundesland) ? (get("bundesland") as Bundesland) : undefined,
    regionId: get("region"),
    jobId: get("stelle"),
    source: ["WEBSITE", "INITIATIV", "MITARBEITEREMPFEHLUNG", "SONSTIGE"].includes(get("quelle") ?? "")
      ? (get("quelle") as CandidateSource)
      : undefined,
    type: get("art") === "INITIATIV" ? "INITIATIV" : get("art") === "STELLE" ? "STELLE" : undefined,
    q: get("q"),
    von: get("von"),
    bis: get("bis"),
    wiedervorlage: get("wiedervorlage") === "aktiv" ? "aktiv" : undefined,
    referral: get("empfehlung") === "ja" ? "ja" : undefined,
  };
  const page = Math.max(1, Number(get("seite") ?? 1) || 1);

  const [{ items, total, pageSize }, regions, jobs] = await Promise.all([
    listApplications(user, filter, page),
    db.region.findMany({ orderBy: { name: "asc" } }),
    db.job.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const canSeeAll = hasPermission(user, "candidates.read.all");

  return (
    <>
      <PageHeader
        title="Bewerbungen"
        description={`${total} ${total === 1 ? "Bewerbung" : "Bewerbungen"}${canSeeAll ? "" : " in Deinem Bereich"}`}
      />

      <form method="get" className="mb-4 grid gap-3 border border-line bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Suche</span>
          <input type="text" name="q" defaultValue={filter.q ?? ""} placeholder="Name, E-Mail, Telefon, Ort" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Status</span>
          <select name="status" defaultValue={filter.status ?? ""} className={inputCls}>
            <option value="">Alle</option>
            <option value="NEU">Neu</option>
            <option value="OFFEN">Offen</option>
            {Object.entries(MANUAL_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Bundesland</span>
          <select name="bundesland" defaultValue={filter.bundesland ?? ""} className={inputCls}>
            <option value="">Alle</option>
            {ALL_BUNDESLAENDER.map((bl) => (
              <option key={bl} value={bl}>
                {BUNDESLAND_LABEL[bl]}
              </option>
            ))}
          </select>
        </label>
        {canSeeAll ? (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Team / Region</span>
            <select name="region" defaultValue={filter.regionId ?? ""} className={inputCls}>
              <option value="">Alle</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Stelle</span>
          <select name="stelle" defaultValue={filter.jobId ?? ""} className={inputCls}>
            <option value="">Alle</option>
            <option value="">–</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Quelle</span>
          <select name="quelle" defaultValue={get("quelle") ?? ""} className={inputCls}>
            <option value="">Alle</option>
            <option value="WEBSITE">Website</option>
            <option value="INITIATIV">Initiativ</option>
            <option value="MITARBEITEREMPFEHLUNG">Mitarbeiterempfehlung</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Von</span>
          <input type="date" name="von" defaultValue={filter.von ?? ""} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Bis</span>
          <input type="date" name="bis" defaultValue={filter.bis ?? ""} className={inputCls} />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="wiedervorlage" value="aktiv" defaultChecked={filter.wiedervorlage === "aktiv"} className="h-4 w-4 accent-brand" />
          Aktive Wiedervorlage
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="empfehlung" value="ja" defaultChecked={filter.referral === "ja"} className="h-4 w-4 accent-brand" />
          Nur Empfehlungen
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm">
            Filtern
          </Button>
          <Link href="/admin/bewerbungen" className="prose-link pb-1.5 text-sm">
            Zurücksetzen
          </Link>
        </div>
      </form>

      {items.length ? (
        <Table
          head={
            <>
              <Th>Name</Th>
              <Th>Wohnort</Th>
              <Th>Telefon</Th>
              <Th>Bundesland</Th>
              <Th>Stelle</Th>
              <Th>Status</Th>
              <Th>Zuständig</Th>
              <Th>Eingang</Th>
            </>
          }
        >
          {items.map((app) => (
            <TrLink key={app.id}>
              <Td className="font-semibold text-ink">
                <Link href={`/admin/bewerbungen/${app.id}`} className="block hover:text-brand">
                  {app.candidate.firstName} {app.candidate.lastName}
                  {app.referralId ? <Badge tone="blue">Empfehlung</Badge> : null}
                </Link>
              </Td>
              <Td>{app.city}</Td>
              <Td className="whitespace-nowrap">{app.candidate.phone}</Td>
              <Td>{BUNDESLAND_KURZ[app.bundesland]}</Td>
              <Td>{app.job?.title ?? "Initiativ"}</Td>
              <Td>
                <Badge tone={statusTone(app)}>{statusLabel(app)}</Badge>
              </Td>
              <Td>{app.assignedUser?.name ?? app.responsibleRegion.name}</Td>
              <Td className="whitespace-nowrap">{formatDate(app.createdAt)}</Td>
            </TrLink>
          ))}
        </Table>
      ) : (
        <EmptyState
          title="Keine Bewerbungen gefunden"
          hint={filter.q || filter.status ? "Probier es mit weniger Filtern." : "Sobald Bewerbungen eingehen, erscheinen sie hier."}
        />
      )}

      {pages > 1 ? (
        <nav aria-label="Seiten" className="mt-4 flex items-center gap-2 text-sm">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => {
            const sp = new URLSearchParams();
            for (const [k, v] of Object.entries(params)) if (typeof v === "string" && v) sp.set(k, v);
            sp.set("seite", String(p));
            return (
              <Link
                key={p}
                href={`/admin/bewerbungen?${sp.toString()}`}
                aria-current={p === page ? "page" : undefined}
                className={p === page ? "bg-brand px-3 py-1.5 font-semibold text-white" : "border border-line bg-white px-3 py-1.5 hover:border-brand"}
              >
                {p}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </>
  );
}
