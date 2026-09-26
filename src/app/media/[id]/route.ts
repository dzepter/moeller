import { db } from "@/lib/db";
import { storage, etagFor } from "@/lib/storage";
import { getCurrentUser } from "@/lib/rbac";
import { canDeliverMediaAsset } from "@/server/media-access";

/**
 * Auslieferung von Medienbibliotheks-Dateien. Die komplette
 * Zugriffsentscheidung (Freigabestatus, INTERNAL-Scoping auf die eigene
 * Academy-Kursversion, Redaktions-Vorschau) liegt zentral und testbar in
 * src/server/media-access.ts.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) return new Response("Nicht gefunden", { status: 404 });

  const user = await getCurrentUser();
  let academyCourseVersionId: string | null = null;
  if (!user) {
    const { getAcademySession } = await import("@/lib/academy-session");
    const session = await getAcademySession();
    academyCourseVersionId = session?.assignment.courseVersionId ?? null;
  }

  const decision = await canDeliverMediaAsset(asset, { user, academyCourseVersionId });
  // 404 statt 403: Asset-IDs außerhalb des eigenen Zugriffsbereichs sollen
  // nicht als „existiert, aber verboten“ erkennbar sein.
  if (!decision.allow) return new Response("Nicht gefunden", { status: 404 });

  let data: Buffer;
  try {
    data = await storage.get(asset.visibility === "PUBLIC" ? "public" : "private", asset.fileName);
  } catch (err) {
    // DB-Zeile ohne physische Datei (z. B. Storage-Inkonsistenz): sauberes 404
    // statt 500 – und ein Log für den Betrieb.
    console.warn(`[media] Datei fehlt im Storage: ${asset.id} → ${asset.fileName}`, err instanceof Error ? err.message : err);
    return new Response("Nicht gefunden", { status: 404 });
  }
  const etag = etagFor(data);
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304 });

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": asset.mime,
      "Cache-Control": decision.publicCache ? "public, max-age=31536000, immutable" : "private, no-store",
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
