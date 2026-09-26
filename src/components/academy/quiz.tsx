"use client";

import { useActionState, useRef, useState } from "react";
import { answerQuestionAction, tryCompleteAction, type QuizState, type CompleteState } from "@/app/actions/academy-learn";
import { cn } from "@/lib/utils";

/** Verständnisfrage: sofortiges Feedback, bei Fehlern Erklärung + erneut versuchen. */
export function QuizQuestion({
  lessonId,
  question,
}: {
  lessonId: string;
  question: { id: string; text: string; options: Array<{ id: string; text: string }>; multiple: boolean };
}) {
  const [state, formAction, pending] = useActionState<QuizState, FormData>(answerQuestionAction, null);

  return (
    <form action={formAction} className="border border-line bg-white p-5 md:p-6">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="questionId" value={question.id} />
      <fieldset disabled={state?.correct === true}>
        <legend className="font-display text-[1.05rem] font-bold text-ink">{question.text}</legend>
        <div className="mt-3 space-y-2">
          {question.options.map((option) => (
            <label
              key={option.id}
              className="flex min-h-[2.75rem] cursor-pointer items-center gap-3 rounded-[2px] border-[1.5px] border-line px-4 py-2.5 transition-colors has-checked:border-brand has-checked:bg-brand-wash hover:border-brand"
            >
              <input
                type={question.multiple ? "checkbox" : "radio"}
                name="option"
                value={option.id}
                className="h-4 w-4 accent-brand"
              />
              <span>{option.text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state?.error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : null}
      {state?.correct === true ? (
        <p role="status" className="mt-3 border-l-2 border-positive bg-positive-wash px-3 py-2 text-sm font-semibold text-positive">
          Richtig! 👍
        </p>
      ) : null}
      {state?.correct === false ? (
        <div role="status" className="mt-3 border-l-2 border-danger bg-danger-wash px-3 py-2.5 text-sm">
          <p className="font-semibold text-danger">Das stimmt noch nicht ganz.</p>
          {state.explanation ? <p className="mt-1 text-ink-soft">{state.explanation}</p> : null}
          <p className="mt-1 text-ink-mute">Versuch es einfach nochmal – das ist völlig okay.</p>
        </div>
      ) : null}

      {state?.correct !== true ? (
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-[2px] border-[1.5px] border-ink px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white disabled:opacity-50"
        >
          {pending ? "Wird geprüft …" : state?.correct === false ? "Nochmal antworten" : "Antwort prüfen"}
        </button>
      ) : null}
    </form>
  );
}

/** Abschlussbox: prüft Pflichtlektionen + Wissenscheck und schließt den Kurs ab. */
export function CourseCompleteBox({ unanswered }: { unanswered: number }) {
  const [state, formAction, pending] = useActionState<CompleteState, FormData>(tryCompleteAction, null);

  if (state?.done && state.passed) {
    return (
      <div className="border-2 border-positive bg-positive-wash p-6 text-center">
        <p className="font-display text-2xl font-extrabold text-ink">🎉 Herzlichen Glückwunsch!</p>
        <p className="mt-2">
          Du hast die Schulung mit {state.scorePct} % bestanden. Dein Abschluss wurde gespeichert –
          der Innendienst sieht ihn automatisch. Wir freuen uns auf Deinen ersten Einsatz!
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="border-2 border-brand bg-brand-wash p-6">
      <p className="font-display text-lg font-bold text-ink">Alle Lektionen abgeschlossen – stark!</p>
      {unanswered > 0 ? (
        <p className="mt-2 text-[0.95rem]">
          Dir {unanswered === 1 ? "fehlt noch 1 unbeantwortete Verständnisfrage" : `fehlen noch ${unanswered} unbeantwortete Verständnisfragen`} in den
          Lektionen. Geh die betreffenden Lektionen nochmal durch und beantworte die Fragen – dann kannst Du hier abschließen.
        </p>
      ) : (
        <p className="mt-2 text-[0.95rem]">Schließe jetzt die Schulung ab – Deine Antworten aus den Lektionen zählen als Wissenscheck.</p>
      )}
      {state && !state.done ? (
        <p role="status" className="mt-2 text-sm font-medium text-danger">
          {state.missingLessons
            ? `Es fehlen noch ${state.missingLessons} Lektion(en).`
            : state.missingQuestions
              ? `Es fehlen noch ${state.missingQuestions} beantwortete Frage(n).`
              : state.passed === false
                ? `Ergebnis ${state.scorePct} % – für den Abschluss brauchst Du die Bestehensgrenze. Schau Dir die Erklärungen an und beantworte die Fragen erneut; es zählt immer Deine letzte Antwort.`
                : null}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || unanswered > 0}
        className="mt-4 rounded-[2px] bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
      >
        {pending ? "Wird geprüft …" : "Schulung abschließen"}
      </button>
    </form>
  );
}

/** Zoombarer Screenshot (mobil wichtig): öffnet als Dialog in voller Größe. */
export function Lightbox({ src, alt }: { src: string; alt: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="group block w-full cursor-zoom-in"
        aria-label={`Screenshot vergrößern: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={cn("mx-auto max-h-[26rem] w-auto max-w-full border border-line-soft", !loaded && "min-h-24 bg-paper-warm")}
        />
        <span className="mt-1.5 block text-center text-xs text-ink-mute group-hover:text-brand">Zum Vergrößern tippen</span>
      </button>
      <dialog
        ref={dialogRef}
        closedby="any"
        className="m-auto max-h-[95dvh] max-w-[95vw] border-0 bg-transparent p-0 backdrop:bg-ink/80"
        aria-label={alt}
      >
        <button type="button" onClick={() => dialogRef.current?.close()} className="block cursor-zoom-out">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-[92dvh] w-auto max-w-[95vw] bg-white" />
          <span className="mt-2 block bg-ink px-3 py-1.5 text-center text-sm text-white">Schließen (Esc oder tippen)</span>
        </button>
      </dialog>
    </>
  );
}
