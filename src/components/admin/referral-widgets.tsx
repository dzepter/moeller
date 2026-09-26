"use client";

import { useActionState } from "react";
import { referralStatusAction, convertReferralAction } from "@/app/actions/admin-referrals";
import type { ActionResult } from "@/app/actions/admin-candidates";
import { inputCls, Label } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS = [
  ["EMPFEHLUNG_NEU", "Empfehlung neu"],
  ["KONTAKT_AUSSTEHEND", "Kontakt ausstehend"],
  ["KONTAKTIERT", "Kontaktiert"],
  ["INTERESSE", "Interesse"],
  ["KEIN_INTERESSE", "Kein Interesse"],
] as const;

function Feedback({ state }: { state: ActionResult }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="mt-2 border-l-2 border-danger bg-danger-wash px-3 py-1.5 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="mt-2 border-l-2 border-positive bg-positive-wash px-3 py-1.5 text-sm text-positive">
        Gespeichert.
      </p>
    );
  return null;
}

export function ReferralStatusForm({ referralId, current }: { referralId: string; current: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(referralStatusAction, null);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="referralId" value={referralId} />
      <div>
        <Label htmlFor="rf-status">Referral-Status</Label>
        <select id="rf-status" name="toStatus" defaultValue={current} className={inputCls}>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="rf-comment">Kommentar (optional)</Label>
        <input id="rf-comment" name="comment" maxLength={300} className={inputCls} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Wird gespeichert …" : "Status setzen"}
      </Button>
      <Feedback state={state} />
      <p className="text-xs text-ink-mute">
        Referral-Status und Bewerbungsstatus sind bewusst getrennt – erst mit „In Bewerbung übernehmen“
        entsteht ein Bewerbungsdatensatz.
      </p>
    </form>
  );
}

export function ReferralConvertForm({
  referralId,
  duplicates,
}: {
  referralId: string;
  duplicates: Array<{ id: string; firstName: string; lastName: string; city: string }>;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(convertReferralAction, null);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="referralId" value={referralId} />
      {duplicates.length ? (
        <div>
          <Label htmlFor="rf-link">Mit bestehendem Kandidaten verknüpfen?</Label>
          <select id="rf-link" name="linkCandidateId" defaultValue="" className={inputCls}>
            <option value="">Nein – neuen Kandidaten anlegen</option>
            {duplicates.map((d) => (
              <option key={d.id} value={d.id}>
                {d.firstName} {d.lastName} ({d.city})
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Wird übernommen …" : "In Bewerbung übernehmen"}
      </Button>
      <Feedback state={state} />
      <p className="text-xs text-ink-mute">
        Die Empfehlung bleibt inklusive Historie erhalten; die Quelle der Bewerbung bleibt „Mitarbeiterempfehlung“.
      </p>
    </form>
  );
}
