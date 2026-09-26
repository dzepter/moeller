import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAcademySession } from "@/lib/academy-session";
import { cn } from "@/lib/utils";
import { CourseCompleteBox } from "@/components/academy/quiz";

export default async function KursUebersicht() {
  const session = await getAcademySession();
  if (!session) redirect("/academy");
  const assignment = session.assignment;

  const [modules, progress, answers] = await Promise.all([
    db.trainingModule.findMany({
      where: { courseVersionId: assignment.courseVersionId },
      orderBy: { sortOrder: "asc" },
      include: {
        lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, sortOrder: true, questions: { select: { id: true } } } },
      },
    }),
    db.trainingProgress.findMany({ where: { assignmentId: assignment.id, completedAt: { not: null } }, select: { lessonId: true } }),
    db.trainingAnswer.findMany({ where: { assignmentId: assignment.id }, orderBy: { answeredAt: "asc" }, select: { questionId: true, correct: true } }),
  ]);

  const doneLessons = new Set(progress.map((p) => p.lessonId));
  const allLessons = modules.flatMap((m) => m.lessons);
  const pct = allLessons.length ? Math.round((allLessons.filter((l) => doneLessons.has(l.id)).length / allLessons.length) * 100) : 0;
  const nextLesson = allLessons.find((l) => !doneLessons.has(l.id));
  const lastAnswer = new Map<string, boolean>();
  for (const a of answers) lastAnswer.set(a.questionId, a.correct);
  const allQuestionIds = allLessons.flatMap((l) => l.questions.map((q) => q.id));
  const answeredCount = allQuestionIds.filter((id) => lastAnswer.has(id)).length;
  const completed = Boolean(assignment.completion?.passed);

  return (
    <div className="space-y-6">
      <div className="border border-line bg-white p-6 md:p-8">
        <p className="eyebrow">{assignment.courseVersion.course.title}</p>
        <h1 className="mt-3 text-2xl md:text-3xl">
          {completed ? "Geschafft – Du hast die Schulung abgeschlossen!" : `Hallo ${assignment.candidate.firstName}, schön, dass Du da bist!`}
        </h1>
        {!completed ? (
          <p className="mt-3 text-[0.95rem]">
            Arbeite die Module in Deinem Tempo durch – Dein Fortschritt wird automatisch gespeichert,
            auch wenn Du zwischendurch aufhörst oder das Gerät wechselst.
          </p>
        ) : (
          <p className="mt-3 text-[0.95rem]">
            Du kannst alle Module jederzeit wieder öffnen und Dinge nachschlagen – Dein Abschluss bleibt bestehen.
          </p>
        )}

        <div className="mt-5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Gesamtfortschritt">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">Dein Fortschritt</span>
            <span className="font-display font-bold text-brand">{pct} %</span>
          </div>
          <div className="mt-1.5 h-2 bg-paper-warm">
            <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {nextLesson && !completed ? (
          <Link
            href={`/academy/lektion/${nextLesson.id}`}
            className="mt-5 inline-flex items-center gap-2 rounded-[2px] bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-deep"
          >
            {doneLessons.size ? "Weiterlernen: " : "Loslegen: "}
            {nextLesson.title}
          </Link>
        ) : null}
      </div>

      {!completed && pct === 100 ? (
        <CourseCompleteBox unanswered={allQuestionIds.length - answeredCount} />
      ) : null}

      <ol className="space-y-4">
        {modules.map((module, mi) => {
          const moduleDone = module.lessons.every((l) => doneLessons.has(l.id));
          return (
            <li key={module.id} className="border border-line bg-white">
              <div className="flex items-start gap-4 border-b border-line-soft p-5">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center font-display text-sm font-extrabold",
                    moduleDone ? "bg-positive text-white" : "bg-paper-warm text-brand",
                  )}
                  aria-hidden="true"
                >
                  {moduleDone ? "✓" : String(mi + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2 className="text-lg leading-snug">{module.title}</h2>
                  {module.intro ? <p className="mt-0.5 text-sm text-ink-mute">{module.intro}</p> : null}
                </div>
              </div>
              <ul>
                {module.lessons.map((lesson) => {
                  const done = doneLessons.has(lesson.id);
                  return (
                    <li key={lesson.id} className="border-b border-line-soft last:border-b-0">
                      <Link
                        href={`/academy/lektion/${lesson.id}`}
                        className="flex min-h-[3rem] items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-brand-wash/50"
                      >
                        <span className={cn("text-[0.95rem]", done ? "text-ink-mute" : "font-medium text-ink")}>
                          {lesson.title}
                        </span>
                        <span className={cn("text-xs font-semibold", done ? "text-positive" : "text-brand")}>
                          {done ? "Abgeschlossen ✓" : "Öffnen →"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
