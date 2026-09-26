import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { CMS_PAGES } from "@/lib/cms-schema";
import { PageHeader, Table, Th, Td, TrLink, Badge } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Website-Inhalte" };

const PUBLIC_PATH: Record<string, string> = {
  home: "/",
  "ueber-uns": "/ueber-uns",
  "fuer-unternehmen": "/fuer-unternehmen",
  "arbeiten-bei-moeller": "/arbeiten-bei-moeller",
  jobs: "/jobs",
  initiativbewerbung: "/initiativbewerbung",
  empfehlen: "/empfehlen",
  kontakt: "/kontakt",
  impressum: "/impressum",
  datenschutz: "/datenschutz",
};

export default async function WebsitePage() {
  await requirePermission("cms.editContent");
  const pages = await db.cmsPage.findMany({
    include: { publishedRevision: { select: { version: true, publishedAt: true } }, revisions: { orderBy: { version: "desc" }, take: 1 } },
  });
  const bySlug = new Map(pages.map((p) => [p.slug, p]));

  return (
    <>
      <PageHeader
        title="Website-Inhalte"
        description="Texte, Bilder und Sektionen aller öffentlichen Seiten – ohne HTML, mit Entwurf, Vorschau und Versionen."
      />
      <Table
        head={
          <>
            <Th>Seite</Th>
            <Th>Status</Th>
            <Th>Zuletzt bearbeitet</Th>
            <Th></Th>
          </>
        }
      >
        {Object.values(CMS_PAGES).map((def) => {
          const page = bySlug.get(def.slug);
          const latest = page?.revisions[0];
          const published = page?.publishedRevision;
          const hasUnpublished = latest && (!published || latest.version > published.version);
          return (
            <TrLink key={def.slug}>
              <Td className="font-semibold text-ink">
                <Link href={`/admin/website/${def.slug}`} className="hover:text-brand">
                  {def.title}
                </Link>
                <span className="block text-xs font-normal text-ink-mute">{PUBLIC_PATH[def.slug]}</span>
              </Td>
              <Td>
                {hasUnpublished ? (
                  <Badge tone="yellow">Entwurf vorhanden (v{latest.version})</Badge>
                ) : published ? (
                  <Badge tone="green">Veröffentlicht (v{published.version})</Badge>
                ) : (
                  <Badge tone="neutral">Standardinhalte</Badge>
                )}
              </Td>
              <Td className="text-xs text-ink-mute">{latest ? formatDateTime(latest.createdAt) : "–"}</Td>
              <Td className="text-right">
                <a href={PUBLIC_PATH[def.slug]} target="_blank" rel="noopener" className="prose-link text-sm">
                  Live ansehen
                </a>
              </Td>
            </TrLink>
          );
        })}
      </Table>
      <p className="mt-4 text-sm text-ink-mute">
        Team-Mitglieder, Referenzen und optionale Bereiche (FAQ/Referenzen) verwaltest Du unter{" "}
        <Link className="prose-link" href="/admin/einstellungen">
          Einstellungen
        </Link>
        , Bilder unter{" "}
        <Link className="prose-link" href="/admin/medien">
          Medien
        </Link>
        .
      </p>
    </>
  );
}
