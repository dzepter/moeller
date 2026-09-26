import { db } from "@/lib/db";
import { storage, etagFor } from "@/lib/storage";
import { getCurrentUser } from "@/lib/rbac";

/**
 * Auslieferung von Medienbibliotheks-Dateien.
 * PUBLIC-Assets: frei abrufbar (CMS-Bilder). INTERNAL-Assets (z. B. Academy-
 * Screenshots): nur mit Admin-Session oder gültiger Academy-Session.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) return new Response("Nicht gefunden", { status: 404 });

  if (asset.visibility === "INTERNAL") {
    const user = await getCurrentUser();
    if (!user) {
      // Academy-Teilnehmer: Cookie-Session prüfen
      const { getAcademySession } = await import("@/lib/academy-session");
      const session = await getAcademySession();
      if (!session) return new Response("Kein Zugriff", { status: 403 });
    }
  }

  const data = await storage.get(asset.visibility === "PUBLIC" ? "public" : "private", asset.fileName);
  const etag = etagFor(data);
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304 });

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": asset.mime,
      "Cache-Control": asset.visibility === "PUBLIC" ? "public, max-age=31536000, immutable" : "private, max-age=3600",
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
