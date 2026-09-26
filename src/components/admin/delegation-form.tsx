"use client";

import { useActionState } from "react";
import { createDelegationAction } from "@/app/actions/admin-delegations";
import type { ActionResult } from "@/app/actions/admin-candidates";
import { inputCls, Label } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export function DelegationForm({
  teamleiter,
  selfId,
  canManage,
}: {
  teamleiter: Array<{ id: string; name: string }>;
  selfId: string;
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createDelegationAction, null);

  return (
    <form action={formAction} className="space-y-3.5">
      <div>
        <Label htmlFor="dg-from">Wer wird vertreten?</Label>
        <select id="dg-from" name="fromUserId" defaultValue={canManage ? "" : selfId} className={inputCls} required>
          {canManage ? <option value="">Bitte wählen</option> : null}
          {teamleiter
            .filter((t) => canManage || t.id === selfId)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <Label htmlFor="dg-to">Wer übernimmt?</Label>
        <select id="dg-to" name="toUserId" defaultValue="" className={inputCls} required>
          <option value="">Bitte wählen</option>
          {teamleiter.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="dg-start">Beginn</Label>
          <input id="dg-start" name="startsAt" type="date" required className={inputCls} />
        </div>
        <div>
          <Label htmlFor="dg-end">Ende</Label>
          <input id="dg-end" name="endsAt" type="date" required className={inputCls} />
        </div>
      </div>
      <div>
        <Label htmlFor="dg-reason">Grund (optional)</Label>
        <input id="dg-reason" name="reason" maxLength={300} className={inputCls} placeholder="z. B. Urlaub" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Wird angelegt …" : "Vertretung anlegen"}
      </Button>
      {state?.error ? (
        <p role="alert" className="border-l-2 border-danger bg-danger-wash px-3 py-1.5 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="border-l-2 border-positive bg-positive-wash px-3 py-1.5 text-sm text-positive">
          Vertretung angelegt.
        </p>
      ) : null}
      <p className="text-xs text-ink-mute">
        Keine Selbstvertretung, keine zirkulären Vertretungen; Rechte vererben sich nicht über Ketten (A→B und B→C ergibt kein A→C).
      </p>
    </form>
  );
}
