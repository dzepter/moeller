import { db } from "@/lib/db";
import { CMS_PAGES, type CmsPageContent, type CmsFieldValue, type CmsImageValue, type CmsPairValue } from "@/lib/cms-schema";
import { CMS_DEFAULTS } from "@/lib/cms-defaults";
import { audit } from "@/lib/audit";
import { cache } from "react";

/**
 * CMS-Service: veröffentlichte Inhalte lesen (mit Code-Defaults als Fallback),
 * Entwürfe speichern, Versionen veröffentlichen und wiederherstellen.
 */

function mergeContent(defaults: CmsPageContent, stored: CmsPageContent | undefined): CmsPageContent {
  if (!stored) return defaults;
  const out: CmsPageContent = {};
  for (const [sectionKey, sectionDefaults] of Object.entries(defaults)) {
    out[sectionKey] = { ...sectionDefaults, ...(stored[sectionKey] ?? {}) };
  }
  return out;
}

/** Veröffentlichten Inhalt einer Seite laden (request-gecacht). */
export const getPublishedContent = cache(async (slug: string): Promise<CmsPageContent> => {
  const defaults = CMS_DEFAULTS[slug] ?? {};
  try {
    const page = await db.cmsPage.findUnique({
      where: { slug },
      include: { publishedRevision: true },
    });
    const stored = page?.publishedRevision?.content as CmsPageContent | undefined;
    return mergeContent(defaults, stored);
  } catch {
    // DB nicht erreichbar: redaktionelle Defaults ausliefern
    return defaults;
  }
});

/** Neuesten Entwurf (oder veröffentlichte Version) für die Bearbeitung laden. */
export async function getDraftContent(slug: string): Promise<{ content: CmsPageContent; version: number | null }> {
  const defaults = CMS_DEFAULTS[slug] ?? {};
  const page = await db.cmsPage.findUnique({
    where: { slug },
    include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
  });
  const latest = page?.revisions[0];
  return {
    content: mergeContent(defaults, latest?.content as CmsPageContent | undefined),
    version: latest?.version ?? null,
  };
}

export async function saveDraft(slug: string, content: CmsPageContent, userId: string, note?: string) {
  const def = CMS_PAGES[slug];
  if (!def) throw new Error(`Unbekannte CMS-Seite: ${slug}`);
  const page = await db.cmsPage.upsert({
    where: { slug },
    update: {},
    create: { slug, title: def.title, type: slug === "impressum" || slug === "datenschutz" ? "RECHTLICH" : "STANDARD" },
  });
  const latest = await db.cmsRevision.findFirst({ where: { pageId: page.id }, orderBy: { version: "desc" } });
  const revision = await db.cmsRevision.create({
    data: {
      pageId: page.id,
      version: (latest?.version ?? 0) + 1,
      content: content as object,
      createdById: userId,
      note,
    },
  });
  await audit({ action: "cms.saved", actorId: userId, entityType: "CmsPage", entityId: page.id, meta: { slug, version: revision.version } });
  return revision;
}

export async function publishRevision(slug: string, revisionId: string, userId: string) {
  const page = await db.cmsPage.findUnique({ where: { slug } });
  if (!page) throw new Error("Seite nicht gefunden");
  const revision = await db.cmsRevision.findFirst({ where: { id: revisionId, pageId: page.id } });
  if (!revision) throw new Error("Version nicht gefunden");
  await db.$transaction([
    db.cmsRevision.update({ where: { id: revision.id }, data: { publishedAt: new Date() } }),
    db.cmsPage.update({ where: { id: page.id }, data: { publishedRevisionId: revision.id, publishAt: null } }),
  ]);
  await audit({ action: "cms.published", actorId: userId, entityType: "CmsPage", entityId: page.id, meta: { slug, version: revision.version } });
}

export async function listRevisions(slug: string) {
  const page = await db.cmsPage.findUnique({
    where: { slug },
    include: {
      revisions: { orderBy: { version: "desc" }, take: 30, include: { createdBy: { select: { name: true } } } },
    },
  });
  return { page, revisions: page?.revisions ?? [] };
}

// ---------------------------------------------------------------
// Typsichere Getter für Section-Felder (Renderer-Hilfen)
// ---------------------------------------------------------------

export function fText(content: CmsPageContent, section: string, field: string): string {
  const v = content[section]?.[field];
  return typeof v === "string" ? v : "";
}

export function fList(content: CmsPageContent, section: string, field: string): string[] {
  const v = content[section]?.[field];
  return Array.isArray(v) ? (v as string[]).filter((x) => typeof x === "string") : [];
}

export function fPairs(content: CmsPageContent, section: string, field: string): CmsPairValue[] {
  const v = content[section]?.[field] as CmsFieldValue | undefined;
  if (!Array.isArray(v)) return [];
  return (v as CmsPairValue[]).filter((x) => x && typeof x === "object" && "a" in x && "b" in x);
}

export function fImage(content: CmsPageContent, section: string, field: string): CmsImageValue | null {
  const v = content[section]?.[field];
  if (v && typeof v === "object" && !Array.isArray(v) && "src" in v) {
    const image = v as CmsImageValue;
    return image.src ? image : null;
  }
  return null;
}

/** "pfad :: alt"-Zeilen in Bildobjekte auflösen (Galerie-Listen). */
export function parseImageLines(lines: string[]): CmsImageValue[] {
  return lines
    .map((line) => {
      const [src, alt] = line.split("::").map((s) => s.trim());
      return src ? { src, alt: alt ?? "" } : null;
    })
    .filter((x): x is CmsImageValue => Boolean(x));
}
