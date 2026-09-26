"use client";

import { useActionState } from "react";
import { saveLessonAction, publishVersionAction } from "@/app/actions/admin-academy-content";
import type { ActionResult } from "@/app/actions/admin-candidates";
import { inputCls, Label } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export function LessonEditor({
  lessonId,
  title,
  contentText,
  questionsText,
  readonly,
}: {
  lessonId: string;
  title: string;
  contentText: string;
  questionsText: string;
  readonly: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(saveLessonAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="lessonId" value={lessonId} />
      <div>
        <Label htmlFor="le-title">Titel</Label>
        <input id="le-title" name="title" defaultValue={title} disabled={readonly} className={inputCls} />
      </div>
      <div>
        <Label htmlFor="le-content">Inhalt (Blöcke)</Label>
        <textarea
          id="le-content"
          name="contentText"
          defaultValue={contentText}
          disabled={readonly}
          rows={22}
          className={inputCls + " font-mono text-[0.85rem] leading-relaxed"}
        />
      </div>
      <div>
        <Label htmlFor="le-questions">Verständnisfragen</Label>
        <textarea
          id="le-questions"
          name="questionsText"
          defaultValue={questionsText}
          disabled={readonly}
          rows={10}
          className={inputCls + " font-mono text-[0.85rem] leading-relaxed"}
        />
      </div>
      {!readonly ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Wird gespeichert …" : "Lektion speichern"}
        </Button>
      ) : null}
      {state?.error ? (
        <p role="alert" className="border-l-2 border-danger bg-danger-wash px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="border-l-2 border-positive bg-positive-wash px-3 py-2 text-sm text-positive">
          Gespeichert.
        </p>
      ) : null}
    </form>
  );
}

export function PublishVersionForm({ versionId }: { versionId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(publishVersionAction, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Diese Version veröffentlichen? Danach ist sie eingefroren; neue Einladungen nutzen automatisch diese Version.")) e.preventDefault();
      }}
      className="inline"
    >
      <input type="hidden" name="versionId" value={versionId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Wird veröffentlicht …" : "Version veröffentlichen"}
      </Button>
      {state?.error ? <span className="ml-2 text-sm text-danger">{state.error}</span> : null}
    </form>
  );
}
