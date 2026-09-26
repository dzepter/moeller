"use client";

import { useActionState } from "react";
import { startOnboardingAction } from "@/app/actions/academy";
import type { ActionResult } from "@/app/actions/admin-candidates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/admin/ui";

const STATUS_LABEL: Record<string, string> = {
  NICHT_EINGELADEN: "Nicht eingeladen",
  EINGELADEN: "Einladung versendet",
  BEGONNEN: "Begonnen",
  IN_BEARBEITUNG: "In Bearbeitung",
  ABGESCHLOSSEN: "Abgeschlossen",
};

export function OnboardingCard({
  candidateId,
  assignments,
}: {
  candidateId: string;
  assignments: Array<{
    id: string;
    courseTitle: string;
    version: number;
    status: string;
    progressPct: number;
    invitedAt: string | null;
    completed: boolean;
  }>;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(startOnboardingAction, null);

  return (
    <section className="border-2 border-positive/50 bg-positive-wash p-4">
      <h2 className="font-display text-[0.95rem] font-bold text-ink">Zusage – Onboarding</h2>
      {assignments.length ? (
        <ul className="mt-3 space-y-2 text-[0.9rem]">
          {assignments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2">
              <span>
                {a.courseTitle} <span className="text-ink-mute">(v{a.version})</span>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone={a.completed ? "green" : a.status === "EINGELADEN" ? "blue" : "yellow"}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </Badge>
                {a.status !== "ABGESCHLOSSEN" ? <span className="text-xs text-ink-mute">{a.progressPct} %</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">
          Noch kein Onboarding gestartet. Mit einem Klick bekommt die Person ihren persönlichen
          Academy-Zugang per E-Mail.
        </p>
      )}
      <form action={formAction} className="mt-3">
        <input type="hidden" name="candidateId" value={candidateId} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Wird gestartet …" : assignments.length ? "Erneut zuweisen / neu einladen" : "Onboarding starten"}
        </Button>
      </form>
      {state?.error ? (
        <p role="alert" className="mt-2 border-l-2 border-danger bg-danger-wash px-3 py-1.5 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="mt-2 text-sm font-semibold text-positive">
          Einladung versendet.
        </p>
      ) : null}
    </section>
  );
}
