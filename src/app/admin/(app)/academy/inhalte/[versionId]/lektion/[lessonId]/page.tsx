import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { blocksToText, questionsToText } from "@/server/academy/content";
import { PageHeader, Card, Badge } from "@/components/admin/ui";
import { LessonEditor } from "@/components/admin/academy-content-widgets";

export const metadata: Metadata = { title: "Lektion bearbeiten" };

export default async function LektionEditPage({
  params,
}: {
  params: Promise<{ versionId: string; lessonId: string }>;
}) {
  await requirePermission("academy.editContent");
  const { versionId, lessonId } = await params;
  const lesson = await db.trainingLesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { include: { courseVersion: { include: { course: true } } } },
      questions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!lesson || lesson.module.courseVersionId !== versionId) notFound();
  const isDraft = !lesson.module.courseVersion.publishedAt;

  const blocks = ((lesson.content as { blocks?: Array<Record<string, unknown> & { type: string }> } | null)?.blocks ?? []);
  const contentText = blocksToText(blocks);
  const questionsText = questionsToText(
    lesson.questions.map((q) => ({
      question: q.question,
      explanation: q.explanation,
      finalCheck: q.finalCheck,
      options: q.options.map((o) => ({ text: o.text, correct: o.correct })),
    })),
  );

  return (
    <>
      <div className="mb-4 text-sm">
        <Link href={`/admin/academy/inhalte/${versionId}`} className="prose-link">
          ← {lesson.module.courseVersion.course.title} v{lesson.module.courseVersion.version}
        </Link>
      </div>
      <PageHeader
        title={lesson.title}
        description={`Modul: ${lesson.module.title} · Quell-Folien: ${lesson.sourceSlides.join(", ") || "–"}`}
        actions={<Badge tone={isDraft ? "yellow" : "green"}>{isDraft ? "Entwurf" : "eingefroren"}</Badge>}
      />

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <LessonEditor
          lessonId={lesson.id}
          title={lesson.title}
          contentText={contentText}
          questionsText={questionsText}
          readonly={!isDraft}
        />
        <Card title="So schreibst Du Inhalte (ohne Code)">
          <div className="space-y-2 text-[0.85rem] text-ink-soft">
            <p><code className="bg-paper-warm px-1">[text]</code> – normaler Absatz</p>
            <p><code className="bg-paper-warm px-1">[schritte Optionaler Titel]</code> – nummerierte Schritte, je Zeile <code className="bg-paper-warm px-1">- Schritt</code></p>
            <p><code className="bg-paper-warm px-1">[wichtig]</code> – roter Warnhinweis</p>
            <p><code className="bg-paper-warm px-1">[merken]</code> – „Das musst Du Dir merken“-Box, je Zeile <code className="bg-paper-warm px-1">- Punkt</code></p>
            <p><code className="bg-paper-warm px-1">[beispiel]</code> – Beispiel-/Formatkasten</p>
            <p><code className="bg-paper-warm px-1">[screenshot MEDIEN-ID]</code> – Bild aus der Medienbibliothek; erste Zeile = Alt-Text, optional <code className="bg-paper-warm px-1">:: Bildunterschrift</code></p>
            <hr className="border-line-soft" />
            <p className="font-semibold text-ink">Fragen-Format:</p>
            <pre className="whitespace-pre-wrap bg-paper-warm p-2 text-xs">{`F: Die Frage?
+ richtige Antwort
- falsche Antwort
- noch eine falsche
E: Erklärung bei falscher Antwort
! (optional: zählt zum Abschluss-Check)`}</pre>
            <p>Leere Zeile trennt Blöcke bzw. Fragen. Es zählt immer die letzte Antwort der Teilnehmer.</p>
          </div>
        </Card>
      </div>
    </>
  );
}
