import type { Metadata } from "next";
import { requirePermission, hasPermission, requireUser } from "@/lib/rbac";
import { reportOverview } from "@/server/reporting";
import { PageHeader, Card, StatCard, inputCls } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { BUNDESLAND_LABEL } from "@/lib/utils";
import { MANUAL_STATUS_LABEL } from "@/components/admin/status";
import type { ManualStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Reporting" };

const SOURCE_LABEL: Record<string, string> = {
  WEBSITE: "Website",
  INITIATIV: "Initiativ",
  MITARBEITEREMPFEHLUNG: "Mitarbeiterempfehlung",
  SONSTIGE: "Sonstige",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ReportingPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("reporting.view");
  const user = await requireUser();
  const params = await searchParams;

  const toStr = typeof params.bis === "string" && params.bis ? params.bis : new Date().toISOString().slice(0, 10);
  const fromDefault = new Date(Date.now() - 89 * 86_400_000).toISOString().slice(0, 10);
  const fromStr = typeof params.von === "string" && params.von ? params.von : fromDefault;
  const range = { from: new Date(`${fromStr}T00:00:00`), to: new Date(`${toStr}T23:59:59`) };

  const data = await reportOverview(range);
  const canExport = hasPermission(user, "reporting.export");
  const conversionPct = data.referralsTotal ? Math.round((data.referralsConverted / data.referralsTotal) * 100) : null;

  return (
    <>
      <PageHeader title="Reporting" description="Nur Zahlen, mit denen man arbeiten kann – ohne Altersstatistik (wird nicht erhoben)." />

      <form method="get" className="mb-5 flex flex-wrap items-end gap-3 border border-line bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Von</span>
          <input type="date" name="von" defaultValue={fromStr} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-mute">Bis</span>
          <input type="date" name="bis" defaultValue={toStr} className={inputCls} />
        </label>
        <Button type="submit" size="sm">
          Anwenden
        </Button>
        {canExport ? (
          <a
            href={`/api/admin/reporting/export?von=${fromStr}&bis=${toStr}`}
            className="rounded-[2px] border-[1.5px] border-ink px-3.5 py-1.5 text-sm font-semibold text-ink hover:bg-ink hover:text-white"
          >
            CSV exportieren
          </a>
        ) : null}
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Bewerbungen im Zeitraum" value={data.total} />
        <StatCard label="Zusagen" value={data.zusagen} />
        <StatCard label="Absagen" value={data.absagen} />
        <StatCard label="Offen (gesamt)" value={data.open} />
        <StatCard label="Empfehlungen → Bewerbung" value={conversionPct != null ? `${data.referralsConverted}/${data.referralsTotal} (${conversionPct} %)` : "0/0"} />
        <StatCard label="Ø Zeit bis Erstbearbeitung" value={data.avgFirstTouchHours != null ? `${data.avgFirstTouchHours} h` : "–"} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="Nach Bundesland">
          <BarList items={data.byBundesland.map((b) => ({ label: BUNDESLAND_LABEL[b.bundesland], count: b.count }))} />
        </Card>
        <Card title="Nach Stelle">
          <BarList items={data.byJob.slice(0, 10).map((j) => ({ label: j.title, count: j.count }))} />
        </Card>
        <Card title="Nach Quelle">
          <BarList items={data.bySource.map((s) => ({ label: SOURCE_LABEL[s.source] ?? s.source, count: s.count }))} />
        </Card>
        <Card title="Status-Funnel (manuelle Status im Zeitraum)" className="lg:col-span-2 xl:col-span-3">
          <BarList
            items={Object.keys(MANUAL_STATUS_LABEL).map((status) => ({
              label: MANUAL_STATUS_LABEL[status as ManualStatus],
              count: data.statusFlow.find((s) => s.status === status)?.count ?? 0,
            }))}
          />
        </Card>
      </div>
    </>
  );
}

function BarList({ items }: { items: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-[0.9rem]">
          <div className="min-w-0">
            <p className="truncate">{item.label}</p>
            <div className="mt-1 h-1.5 bg-paper-warm">
              <div className="h-full bg-brand" style={{ width: `${(item.count / max) * 100}%` }} aria-hidden="true" />
            </div>
          </div>
          <span className="font-display font-bold text-ink">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}
