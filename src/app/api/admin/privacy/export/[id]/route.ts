import { db } from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/rbac";
import { audit } from "@/lib/audit";

/** Betroffenen-Export: alle gespeicherten Daten einer Person als JSON. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "privacy.manage")) {
    return new Response("Keine Berechtigung", { status: 403 });
  }
  const { id } = await ctx.params;
  const candidate = await db.candidate.findUnique({
    where: { id },
    include: {
      applications: {
        include: {
          job: { select: { title: true } },
          statusHistory: true,
          reminders: true,
        },
      },
      notes: true,
      files: { select: { id: true, originalName: true, mime: true, size: true, createdAt: true } },
      consents: true,
      referrals: true,
      trainingAssignments: { include: { completion: true, progress: true } },
    },
  });
  if (!candidate) return new Response("Nicht gefunden", { status: 404 });

  await audit({ action: "candidate.exported", actorId: user.id, entityType: "Candidate", entityId: id });

  return new Response(JSON.stringify(candidate, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="datenauskunft-${id}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
