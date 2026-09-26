import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission, requireUser } from "@/lib/rbac";
import { CMS_PAGES } from "@/lib/cms-schema";
import { getDraftContent, listRevisions } from "@/server/cms";
import { PageHeader, Card } from "@/components/admin/ui";
import { CmsEditor } from "@/components/admin/cms-editor";
import { publishCmsRevisionAction } from "@/app/actions/admin-cms";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Seite bearbeiten" };

export default async function CmsEditPage({ params }: { params: Promise<{ slug: string }> }) {
  await requirePermission("cms.editContent");
  const user = await requireUser();
  const { slug } = await params;
  const def = CMS_PAGES[slug];
  if (!def) notFound();

  const [{ content }, { page, revisions }] = await Promise.all([getDraftContent(slug), listRevisions(slug)]);
  const canPublish = hasPermission(user, "cms.publish");

  return (
    <>
      <div className="mb-4 text-sm">
        <Link href="/admin/website" className="prose-link">
          ← Alle Seiten
        </Link>
      </div>
      <PageHeader
        title={def.title}
        description="Änderungen werden zuerst als Entwurf gespeichert. „Speichern & veröffentlichen“ stellt sie sofort live."
      />

      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <CmsEditor slug={slug} def={def} content={content} canPublish={canPublish} />

        <div className="space-y-5">
          <Card title="Versionen">
            {revisions.length ? (
              <ul className="space-y-2.5 text-[0.9rem]">
                {revisions.map((rev) => {
                  const isPublished = page?.publishedRevisionId === rev.id;
                  return (
                    <li key={rev.id} className="flex items-center justify-between gap-3 border-b border-line-soft pb-2.5 last:border-b-0 last:pb-0">
                      <span>
                        <span className="font-semibold text-ink">Version {rev.version}</span>
                        {isPublished ? <span className="ml-2 text-xs font-semibold text-positive">LIVE</span> : null}
                        <span className="block text-xs text-ink-mute">
                          {formatDateTime(rev.createdAt)} · {rev.createdBy?.name ?? "System"}
                          {rev.note ? ` · ${rev.note}` : ""}
                        </span>
                      </span>
                      {!isPublished && canPublish ? (
                        <form action={publishCmsRevisionAction}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="revisionId" value={rev.id} />
                          <button type="submit" className="prose-link text-sm whitespace-nowrap">
                            Wiederherstellen &amp; live
                          </button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-mute">Noch keine gespeicherten Versionen – es gelten die redaktionellen Standardinhalte.</p>
            )}
          </Card>

          <Card title="Formatierungs-Hilfe">
            <ul className="space-y-1.5 text-[0.85rem] text-ink-soft">
              <li><code className="bg-paper-warm px-1">Leerzeile</code> = neuer Absatz</li>
              <li><code className="bg-paper-warm px-1">## Text</code> = Zwischenüberschrift</li>
              <li><code className="bg-paper-warm px-1">**Text**</code> = fett, <code className="bg-paper-warm px-1">*Text*</code> = kursiv</li>
              <li><code className="bg-paper-warm px-1">- Punkt</code> = Liste</li>
              <li><code className="bg-paper-warm px-1">&gt; Zitat</code> = Zitat</li>
              <li><code className="bg-paper-warm px-1">[Text](/jobs)</code> = Link</li>
              <li>Listenfelder: ein Eintrag pro Zeile · Paare: <code className="bg-paper-warm px-1">Titel :: Beschreibung</code></li>
              <li>Bilder: Pfad aus der <Link href="/admin/medien" className="prose-link">Medienbibliothek</Link> einfügen</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
