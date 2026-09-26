import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { PageHeader, Badge, Card } from "@/components/admin/ui";
import { PublishVersionForm } from "@/components/admin/academy-content-widgets";

export const metadata: Metadata = { title: "Academy-Inhalte" };

export default async function VersionInhaltePage({ params }: { params: Promise<{ versionId: string }> }) {
  await requirePermission("academy.editContent");
  const { versionId } = await params;
  const version = await db.trainingCourseVersion.findUnique({
    where: { id: versionId },
    include: {
      course: true,
      modules: {
        orderBy: { sortOrder: "asc" },
        include: { lessons: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { questions: true } } } } },
      },
    },
  });
  if (!version) notFound();
  const isDraft = !version.publishedAt;

  return (
    <>
      <div className="mb-4 text-sm">
        <Link href="/admin/academy" className="prose-link">
          ← Academy
        </Link>
      </div>
      <PageHeader
        title={`${version.course.title} – Version ${version.version}`}
        description={
          isDraft
            ? "Entwurf: Inhalte sind frei bearbeitbar. Nach der Veröffentlichung ist diese Version eingefroren."
            : "Veröffentlichte Version – eingefroren. Für Änderungen erstellst Du in der Academy-Übersicht einen neuen Entwurf."
        }
        actions={
          <>
            <Badge tone={isDraft ? "yellow" : "green"}>{isDraft ? "Entwurf" : "Veröffentlicht"}</Badge>
            {isDraft ? <PublishVersionForm versionId={version.id} /> : null}
          </>
        }
      />

      <div className="space-y-4">
        {version.modules.map((module, mi) => (
          <Card key={module.id} title={`Modul ${mi + 1}: ${module.title}`}>
            <ul className="divide-y divide-line-soft">
              {module.lessons.map((lesson) => (
                <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>
                    <span className="font-medium text-ink">{lesson.title}</span>
                    <span className="ml-2 text-xs text-ink-mute">
                      {lesson._count.questions} Frage(n) · Folien {lesson.sourceSlides.join(", ") || "–"}
                    </span>
                  </span>
                  <Link href={`/admin/academy/inhalte/${version.id}/lektion/${lesson.id}`} className="prose-link text-sm">
                    {isDraft ? "Bearbeiten" : "Ansehen"}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
