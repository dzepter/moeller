import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { PageHeader, Card, Badge, EmptyState } from "@/components/admin/ui";
import { MediaUploadForm, MediaEditForm } from "@/components/admin/media-widgets";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Medien" };

export default async function MedienPage() {
  await requirePermission("media.manage");
  const assets = await db.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <>
      <PageHeader
        title="Medienbibliothek"
        description="Bilder hochladen, Alt-Texte pflegen, Freigaben steuern. Bilder mit erkennbaren Fremdmarken bleiben „Freigabe erforderlich“, bis die Veröffentlichung geklärt ist."
      />

      <Card title="Neues Medium hochladen" className="mb-5">
        <MediaUploadForm />
      </Card>

      {assets.length ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <li key={asset.id} className="border border-line bg-white">
              <div className="flex items-center justify-between gap-2 border-b border-line-soft bg-paper-warm px-3 py-2">
                <span className="truncate text-sm font-semibold text-ink">{asset.originalName}</span>
                <Badge tone={asset.approval === "FREIGEGEBEN" ? "green" : asset.approval === "GESPERRT" ? "red" : "yellow"}>
                  {asset.approval === "FREIGEGEBEN" ? "Freigegeben" : asset.approval === "GESPERRT" ? "Gesperrt" : "Freigabe erforderlich"}
                </Badge>
              </div>
              {asset.mime.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/media/${asset.id}`} alt={asset.alt} className="h-40 w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-40 items-center justify-center bg-paper-warm text-sm text-ink-mute">{asset.mime}</div>
              )}
              <div className="px-3 py-2 text-xs text-ink-mute">
                Pfad zum Einfügen: <code className="bg-paper-warm px-1">/media/{asset.id}</code> · {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
                {(asset.size / 1024).toFixed(0)} KB · {formatDate(asset.createdAt)} · {asset.visibility === "INTERNAL" ? "intern" : "öffentlich"}
              </div>
              <div className="border-t border-line-soft p-3">
                <MediaEditForm
                  asset={{
                    id: asset.id,
                    alt: asset.alt,
                    description: asset.description ?? "",
                    credit: asset.credit ?? "",
                    approval: asset.approval,
                    category: asset.category,
                    focalX: asset.focalX,
                    focalY: asset.focalY,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Noch keine Medien" hint="Lade oben das erste Bild hoch. Die kuratierten PoS-Fotos liegen zusätzlich unter /photos/… bereit." />
      )}
    </>
  );
}
