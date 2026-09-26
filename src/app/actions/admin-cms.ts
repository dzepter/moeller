"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, hasPermission } from "@/lib/rbac";
import { CMS_PAGES, type CmsPageContent, type CmsFieldValue, type CmsPairValue } from "@/lib/cms-schema";
import { saveDraft, publishRevision } from "@/server/cms";
import type { ActionResult } from "@/app/actions/admin-candidates";

/**
 * CMS-Formulardaten → strukturiertes Inhaltsobjekt.
 * Feldnamen im Formular: `${sectionKey}.${fieldKey}` (+ ".alt" für Bild-Alt-Texte).
 */
function parseContent(slug: string, formData: FormData): CmsPageContent {
  const def = CMS_PAGES[slug];
  if (!def) throw new Error("Unbekannte Seite");
  const content: CmsPageContent = {};

  for (const [sectionKey, section] of Object.entries(def.sections)) {
    const sectionData: Record<string, CmsFieldValue> = {};
    for (const [fieldKey, field] of Object.entries(section.fields)) {
      const name = `${sectionKey}.${fieldKey}`;
      const raw = String(formData.get(name) ?? "");
      switch (field.type) {
        case "text":
        case "textarea":
        case "richtext":
          sectionData[fieldKey] = raw.slice(0, 20000);
          break;
        case "list":
          sectionData[fieldKey] = raw
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(0, 100);
          break;
        case "pairs":
          sectionData[fieldKey] = raw
            .split("\n")
            .map((line) => {
              const [a, ...rest] = line.split("::");
              return { a: (a ?? "").trim(), b: rest.join("::").trim() };
            })
            .filter((p): p is CmsPairValue => Boolean(p.a))
            .slice(0, 60);
          break;
        case "image": {
          const src = raw.trim().slice(0, 500);
          const alt = String(formData.get(`${name}.alt`) ?? "").trim().slice(0, 300);
          sectionData[fieldKey] = { src, alt };
          break;
        }
      }
    }
    content[sectionKey] = sectionData;
  }
  return content;
}

export type CmsActionState = { ok?: boolean; error?: string; revisionId?: string } | null;

export async function saveCmsDraftAction(_prev: CmsActionState, formData: FormData): Promise<CmsActionState> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "cms.editContent")) return { error: "Keine Berechtigung." };
  const slug = String(formData.get("slug") ?? "");
  const publish = formData.get("publish") === "1";
  if (publish && !hasPermission(user, "cms.publish")) return { error: "Keine Veröffentlichungs-Berechtigung." };

  try {
    const content = parseContent(slug, formData);
    const revision = await saveDraft(slug, content, user.id, publish ? "Direkt veröffentlicht" : undefined);
    if (publish) {
      await publishRevision(slug, revision.id, user.id);
      revalidatePath("/", "layout");
    }
    revalidatePath(`/admin/website/${slug}`);
    return { ok: true, revisionId: revision.id };
  } catch (err) {
    return { error: err instanceof Error && err.message.length < 250 ? err.message : "Speichern fehlgeschlagen." };
  }
}

export async function publishCmsRevisionAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "cms.publish")) return;
  const slug = String(formData.get("slug") ?? "");
  const revisionId = String(formData.get("revisionId") ?? "");
  if (!slug || !revisionId) return;
  try {
    await publishRevision(slug, revisionId, user.id);
    revalidatePath("/", "layout");
  } catch {
    /* Zustand über UI sichtbar */
  }
  revalidatePath(`/admin/website/${slug}`);
}
