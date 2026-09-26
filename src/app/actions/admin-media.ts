"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { storage, validateUpload, detectedMime, randomFileName, MAX_UPLOAD_BYTES, malwareScanner } from "@/lib/storage";
import type { ActionResult } from "@/app/actions/admin-candidates";
import type { MediaApproval, MediaCategory, MediaVisibility } from "@prisma/client";

export async function uploadMediaAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "media.manage")) return { error: "Keine Berechtigung." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Bitte eine Datei auswählen." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Die Datei ist größer als 10 MB." };
  const data = Buffer.from(await file.arrayBuffer());
  const validationError = validateUpload(file.name, data, ["image", "pdf"]);
  if (validationError) return { error: validationError };
  const scan = await malwareScanner.scan(data);
  if (!scan.clean) return { error: "Die Datei konnte nicht angenommen werden." };

  const category = String(formData.get("category") ?? "SONSTIGE") as MediaCategory;
  const visibility = String(formData.get("visibility") ?? "PUBLIC") as MediaVisibility;
  const alt = String(formData.get("alt") ?? "").slice(0, 300);

  // Bildmaße für width/height (Layout-Stabilität)
  let width: number | null = null;
  let height: number | null = null;
  const mime = detectedMime(file.name, data);
  if (mime === "image/png") {
    width = data.readUInt32BE(16);
    height = data.readUInt32BE(20);
  } else if (mime === "image/jpeg") {
    // SOF-Marker suchen
    let offset = 2;
    while (offset < data.length - 8) {
      if (data[offset] !== 0xff) break;
      const marker = data[offset + 1] as number;
      const size = data.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        height = data.readUInt16BE(offset + 5);
        width = data.readUInt16BE(offset + 7);
        break;
      }
      offset += 2 + size;
    }
  }

  const fileName = randomFileName(file.name);
  const scope = visibility === "PUBLIC" ? ("public" as const) : ("private" as const);
  await storage.put(scope, fileName, data, mime);
  let asset;
  try {
    asset = await db.mediaAsset.create({
      data: {
        fileName,
        originalName: file.name.slice(0, 200),
        mime,
        size: data.length,
        width,
        height,
        alt,
        category,
        visibility,
        approval: "FREIGABE_ERFORDERLICH",
        uploadedById: user.id,
      },
    });
  } catch (err) {
    // Kompensation: DB-Anlage fehlgeschlagen → physische Datei wieder
    // entfernen, damit kein Storage-Orphan ohne DB-Referenz zurückbleibt.
    await storage.delete(scope, fileName).catch((cleanupErr) => {
      console.error(`[media] Kompensations-Löschung fehlgeschlagen: ${scope}/${fileName}`, cleanupErr);
    });
    console.error("[media] Upload-DB-Anlage fehlgeschlagen:", err instanceof Error ? err.message : err);
    return { error: "Der Upload konnte nicht gespeichert werden. Bitte erneut versuchen." };
  }
  await audit({ action: "media.uploaded", actorId: user.id, entityType: "MediaAsset", entityId: asset.id, meta: { category, visibility } });
  revalidatePath("/admin/medien");
  return { ok: true };
}

export async function updateMediaAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "media.manage")) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.mediaAsset.update({
    where: { id },
    data: {
      alt: String(formData.get("alt") ?? "").slice(0, 300),
      description: String(formData.get("description") ?? "").slice(0, 500) || null,
      credit: String(formData.get("credit") ?? "").slice(0, 200) || null,
      approval: String(formData.get("approval") ?? "FREIGABE_ERFORDERLICH") as MediaApproval,
      category: String(formData.get("category") ?? "SONSTIGE") as MediaCategory,
      focalX: Math.min(1, Math.max(0, Number(formData.get("focalX") ?? 0.5) || 0.5)),
      focalY: Math.min(1, Math.max(0, Number(formData.get("focalY") ?? 0.5) || 0.5)),
    },
  });
  await audit({ action: "media.updated", actorId: user.id, entityType: "MediaAsset", entityId: id });
  revalidatePath("/admin/medien");
}

export async function deleteMediaAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "media.manage")) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) return;
  // DB zuerst: Danach existiert garantiert keine Referenz mehr auf die Datei.
  // Schlägt anschließend das Storage-Löschen fehl, bleibt schlimmstenfalls
  // eine referenzlose Datei zurück – das wird geloggt und kann nachgeräumt
  // werden; die umgekehrte, gefährliche Richtung (DB zeigt auf gelöschte
  // Datei) ist ausgeschlossen. Schlägt schon das DB-Löschen fehl, ist gar
  // nichts passiert (voll wiederholbar).
  await db.mediaAsset.delete({ where: { id } });
  await storage.delete(asset.visibility === "PUBLIC" ? "public" : "private", asset.fileName).catch((err) => {
    console.error(
      `[media] Storage-Löschung fehlgeschlagen (Datei bleibt referenzlos zurück): ${asset.visibility === "PUBLIC" ? "public" : "private"}/${asset.fileName}`,
      err,
    );
  });
  await audit({ action: "media.deleted", actorId: user.id, entityType: "MediaAsset", entityId: id, meta: { name: asset.originalName } });
  revalidatePath("/admin/medien");
}
