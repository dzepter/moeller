import { db } from "@/lib/db";
import { hasPermission, type CurrentUser } from "@/lib/rbac";
import type { MediaApproval, MediaVisibility } from "@prisma/client";

/**
 * Zentrale Zugriffsentscheidung für Medienauslieferung (/media/[id]).
 *
 * Regeln:
 * - PUBLIC wird nur ausgeliefert, wenn das Asset FREIGEGEBEN ist. Der
 *   Freigabestatus ist damit technisch durchgesetzt, nicht nur redaktionell.
 *   Nicht freigegebene oder gesperrte PUBLIC-Assets sehen ausschließlich
 *   Redaktionsrollen (Vorschau), niemals die Öffentlichkeit.
 * - INTERNAL für interne Benutzer: nicht bloß „eingeloggt“, sondern eine
 *   passende Berechtigung (Medien-/Academy-Redaktion oder Academy-Betreuung).
 * - INTERNAL für Academy-Teilnehmer: nur Assets, die über TrainingAsset zu
 *   IHRER zugewiesenen Kursversion gehören. Eine gültige Academy-Session ist
 *   ausdrücklich KEIN Generalschlüssel für beliebige INTERNAL-Asset-IDs.
 * - GESPERRT wird außerhalb der Redaktions-Vorschau nie ausgeliefert.
 */

export type MediaAccessInput = {
  id: string;
  visibility: MediaVisibility;
  approval: MediaApproval;
};

export type MediaAccessContext = {
  user: CurrentUser | null;
  /** Kursversion der gültigen Academy-Session des Teilnehmers (falls vorhanden). */
  academyCourseVersionId: string | null;
};

const EDITOR_PERMISSIONS = ["media.manage", "cms.editContent", "academy.editContent"] as const;
const INTERNAL_VIEW_PERMISSIONS = [
  ...EDITOR_PERMISSIONS,
  "academy.manageParticipants",
  "academy.viewRegional",
] as const;

export async function canDeliverMediaAsset(
  asset: MediaAccessInput,
  ctx: MediaAccessContext,
): Promise<{ allow: boolean; publicCache: boolean }> {
  const isEditor = ctx.user !== null && EDITOR_PERMISSIONS.some((p) => hasPermission(ctx.user as CurrentUser, p));

  if (asset.visibility === "PUBLIC") {
    if (asset.approval === "FREIGEGEBEN") return { allow: true, publicCache: true };
    return { allow: isEditor, publicCache: false };
  }

  // INTERNAL
  if (asset.approval === "GESPERRT") return { allow: isEditor, publicCache: false };

  if (ctx.user) {
    const allow = INTERNAL_VIEW_PERMISSIONS.some((p) => hasPermission(ctx.user as CurrentUser, p));
    return { allow, publicCache: false };
  }

  if (ctx.academyCourseVersionId) {
    const linked = await db.trainingAsset.findUnique({
      where: {
        courseVersionId_mediaAssetId: {
          courseVersionId: ctx.academyCourseVersionId,
          mediaAssetId: asset.id,
        },
      },
      select: { id: true },
    });
    return { allow: Boolean(linked), publicCache: false };
  }

  return { allow: false, publicCache: false };
}
