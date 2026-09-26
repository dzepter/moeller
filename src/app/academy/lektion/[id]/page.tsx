import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAcademySession } from "@/lib/academy-session";
import { completeLessonAction } from "@/app/actions/academy-learn";
import { QuizQuestion, Lightbox } from "@/components/academy/quiz";

type BlockJson =
  | { type: "intro"; text: string }
  | { type: "steps"; title?: string; items: string[] }
  | { type: "screenshot"; mediaId: string; alt: string; caption?: string | null }
  | { type: "warning"; text: string }
  | { type: "remember"; items: string[] }
  | { type: "example"; text: string };

export default async function LektionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAcademySession();
  if (!session) redirect("/academy");
  const { id } = await params;

  const lesson = await db.trainingLesson.findUnique({
    where: { id },
    include: {
      module: { include: { courseVersion: true } },
      questions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!lesson || lesson.module.courseVersionId !== session.assignment.courseVersionId) notFound();

  // Nächste Lektion in der Kursreihenfolge ermitteln
  const modules = await db.trainingModule.findMany({
    where: { courseVersionId: session.assignment.courseVersionId },
    orderBy: { sortOrder: "asc" },
    include: { lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true } } },
  });
  const flat = modules.flatMap((m) => m.lessons);
  const idx = flat.findIndex((l) => l.id === lesson.id);
  const next = idx >= 0 ? flat[idx + 1] : undefined;

  const progress = await db.trainingProgress.findUnique({
    where: { assignmentId_lessonId: { assignmentId: session.assignmentId, lessonId: lesson.id } },
  });
  const alreadyDone = Boolean(progress?.completedAt);

  const blocks = ((lesson.content as { blocks?: BlockJson[] } | null)?.blocks ?? []) as BlockJson[];

  return (
    <article className="space-y-5">
      <nav className="text-sm">
        <Link href="/academy/kurs" className="prose-link">
          ← Zur Modulübersicht
        </Link>
      </nav>

      <header className="border border-line bg-white p-6 md:p-8">
        <p className="eyebrow">{lesson.module.title}</p>
        <h1 className="mt-3 text-2xl md:text-3xl">{lesson.title}</h1>
      </header>

      <div className="space-y-4">
        {blocks.map((block, i) => {
          switch (block.type) {
            case "intro":
              return (
                <p key={i} className="border border-line bg-white p-5 text-[1.02rem] leading-relaxed md:p-6">
                  {block.text}
                </p>
              );
            case "steps":
              return (
                <div key={i} className="border border-line bg-white p-5 md:p-6">
                  {block.title ? <h2 className="mb-3 text-lg">{block.title}</h2> : null}
                  <ol className="space-y-2.5">
                    {block.items.map((item, li) => (
                      <li key={li} className="grid grid-cols-[auto_1fr] gap-3">
                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center bg-brand-wash font-display text-xs font-extrabold text-brand" aria-hidden="true">
                          {li + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            case "screenshot":
              return (
                <figure key={i} className="border border-line bg-white p-4">
                  <Lightbox src={`/media/${block.mediaId}`} alt={block.alt} />
                  {block.caption ? <figcaption className="mt-2 text-sm text-ink-mute">{block.caption}</figcaption> : null}
                </figure>
              );
            case "warning":
              return (
                <p key={i} className="border-l-4 border-danger bg-danger-wash p-5 font-medium text-ink">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-danger">Wichtig</span>
                  {block.text}
                </p>
              );
            case "remember":
              return (
                <div key={i} className="border-l-4 border-brand bg-brand-wash p-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-deep">Das musst Du Dir merken</p>
                  <ul className="space-y-1.5">
                    {block.items.map((item, li) => (
                      <li key={li} className="grid grid-cols-[auto_1fr] gap-2.5">
                        <span aria-hidden="true" className="font-bold text-brand">
                          →
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            case "example":
              return (
                <p key={i} className="border border-dashed border-line bg-paper-warm p-5 font-mono text-[0.9rem]">
                  {block.text}
                </p>
              );
            default:
              return null;
          }
        })}
      </div>

      {lesson.questions.length ? (
        <section aria-label="Verständnisfragen" className="space-y-4">
          <h2 className="text-xl">Kurz nachgefragt</h2>
          {lesson.questions.map((question) => (
            <QuizQuestion
              key={question.id}
              lessonId={lesson.id}
              question={{
                id: question.id,
                text: question.question,
                options: question.options.map((o) => ({ id: o.id, text: o.text })),
                multiple: question.options.filter((o) => o.correct).length > 1,
              }}
            />
          ))}
        </section>
      ) : null}

      <form action={completeLessonAction} className="border-t border-line pt-5">
        <input type="hidden" name="lessonId" value={lesson.id} />
        <input type="hidden" name="nextHref" value={next ? `/academy/lektion/${next.id}` : "/academy/kurs"} />
        <button
          type="submit"
          className="w-full rounded-[2px] bg-brand px-5 py-3.5 text-center font-semibold text-white hover:bg-brand-deep md:w-auto md:px-8"
        >
          {alreadyDone
            ? next
              ? `Weiter zu: ${next.title}`
              : "Zur Modulübersicht"
            : next
              ? `Lektion abschließen & weiter`
              : "Lektion abschließen"}
        </button>
      </form>
    </article>
  );
}
