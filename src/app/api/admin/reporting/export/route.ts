import { getCurrentUser, hasPermission } from "@/lib/rbac";
import { reportOverview, overviewToCsv } from "@/server/reporting";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "reporting.export")) {
    return new Response("Keine Berechtigung", { status: 403 });
  }
  const url = new URL(req.url);
  const von = url.searchParams.get("von") ?? new Date(Date.now() - 89 * 86_400_000).toISOString().slice(0, 10);
  const bis = url.searchParams.get("bis") ?? new Date().toISOString().slice(0, 10);
  const range = { from: new Date(`${von}T00:00:00`), to: new Date(`${bis}T23:59:59`) };

  const data = await reportOverview(range);
  const csv = overviewToCsv(data, range);
  await audit({ action: "reporting.exported", actorId: user.id, meta: { von, bis } });

  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="moeller-reporting-${von}-bis-${bis}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
