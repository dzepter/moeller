import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, applicationScope, hasPermission } from "@/lib/rbac";
import { storage, etagFor } from "@/lib/storage";

/**
 * Autorisierte Auslieferung privater Bewerberdateien (niemals öffentlich).
 * Zugriff nur, wenn der Nutzer den zugehörigen Bewerber sehen darf.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Nicht angemeldet", { status: 401 });

  const { id } = await ctx.params;
  const file = await db.privateFile.findUnique({ where: { id } });
  // Zur Löschung markierte Dateien (Retention Phase 1) gelten als gelöscht,
  // auch wenn die physische Entfernung noch aussteht.
  if (!file || file.pendingDeletionAt) notFound();

  if (!hasPermission(user, "candidates.read.all")) {
    if (!file.candidateId) return new Response("Kein Zugriff", { status: 403 });
    const scope = await applicationScope(user);
    const visible = await db.application.findFirst({ where: { ...scope, candidateId: file.candidateId }, select: { id: true } });
    if (!visible) return new Response("Kein Zugriff", { status: 403 });
  }

  let data: Buffer;
  try {
    data = await storage.get("private", file.fileName);
  } catch (err) {
    console.warn(`[files] Datei fehlt im Storage: ${file.id} → ${file.fileName}`, err instanceof Error ? err.message : err);
    notFound();
  }
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `attachment; filename="${file.originalName.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      ETag: etagFor(data),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
