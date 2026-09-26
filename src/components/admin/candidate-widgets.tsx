"use client";

import { useActionState, useState } from "react";
import {
  changeStatusAction,
  reassignAction,
  addNoteAction,
  editNoteAction,
  createReminderAction,
  type ActionResult,
} from "@/app/actions/admin-candidates";
import { MANUAL_STATUS_LABEL } from "@/components/admin/status";
import { inputCls, Label } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

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

export function StatusForm({ applicationId, current }: { applicationId: string; current: string | null }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(changeStatusAction, null);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div>
        <Label htmlFor="st-status">Neuer Status</Label>
        <select id="st-status" name="manualStatus" required defaultValue={current ?? ""} className={inputCls}>
          <option value="" disabled>
            Bitte wählen
          </option>
          {Object.entries(MANUAL_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="st-comment">Kommentar (optional)</Label>
        <input id="st-comment" name="comment" maxLength={500} className={inputCls} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Wird gespeichert …" : "Status setzen"}
      </Button>
      <Feedback state={state} />
      <p className="text-xs text-ink-mute">
        Hinweis: Sobald ein manueller Status gesetzt ist, endet die automatische Neu/Offen-Logik.
      </p>
    </form>
  );
}

export function AssignForm({
  applicationId,
  regions,
  users,
  currentRegionId,
  currentUserId,
}: {
  applicationId: string;
  regions: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  currentRegionId: string;
  currentUserId: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(reassignAction, null);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div>
        <Label htmlFor="as-region">Team / Region</Label>
        <select id="as-region" name="regionId" defaultValue={currentRegionId} className={inputCls}>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="as-user">Direkt zugewiesen an (optional)</Label>
        <select id="as-user" name="assignedUserId" defaultValue={currentUserId ?? ""} className={inputCls}>
          <option value="">– niemand direkt –</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="as-reason">Begründung (optional)</Label>
        <input id="as-reason" name="reason" maxLength={300} className={inputCls} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Wird gespeichert …" : "Zuordnung speichern"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function NoteForm({ candidateId, applicationId }: { candidateId: string; applicationId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(addNoteAction, null);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="candidateId" value={candidateId} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <div>
        <Label htmlFor="nt-body">Neue Notiz (intern, für Bewerber nicht sichtbar)</Label>
        <textarea id="nt-body" name="body" rows={3} maxLength={2000} required className={inputCls} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Wird gespeichert …" : "Notiz speichern"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function NoteItem({
  note,
  applicationId,
}: {
  note: { id: string; body: string; createdAt: string; authorName: string | null; edited: boolean };
  applicationId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(editNoteAction, null);

  return (
    <li className="border-l-2 border-line py-1 pl-3">
      {editing ? (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="noteId" value={note.id} />
          <input type="hidden" name="applicationId" value={applicationId} />
          <textarea name="body" defaultValue={note.body} rows={3} maxLength={2000} required className={inputCls} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Speichern
            </Button>
            <button type="button" onClick={() => setEditing(false)} className="prose-link text-sm">
              Abbrechen
            </button>
          </div>
          <Feedback state={state} />
        </form>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-[0.95rem]">{note.body}</p>
          <p className="mt-1 text-xs text-ink-mute">
            {note.authorName ?? "Unbekannt"} · {note.createdAt}
            {note.edited ? " · bearbeitet" : ""}
            {" · "}
            <button type="button" onClick={() => setEditing(true)} className="prose-link">
              Bearbeiten
            </button>
          </p>
        </>
      )}
    </li>
  );
}

export function ReminderForm({
  candidateId,
  applicationId,
  referralId,
  users,
  defaultAssigneeId,
}: {
  candidateId?: string;
  applicationId?: string;
  referralId?: string;
  users: Array<{ id: string; name: string }>;
  defaultAssigneeId: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createReminderAction, null);
  return (
    <form action={formAction} className="space-y-3">
      {candidateId ? <input type="hidden" name="candidateId" value={candidateId} /> : null}
      {applicationId ? <input type="hidden" name="applicationId" value={applicationId} /> : null}
      {referralId ? <input type="hidden" name="referralId" value={referralId} /> : null}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="rm-date">Datum</Label>
          <input id="rm-date" name="dueDate" type="date" required className={inputCls} />
        </div>
        <div>
          <Label htmlFor="rm-time">Uhrzeit (optional)</Label>
          <input id="rm-time" name="dueTime" type="time" className={inputCls} />
        </div>
      </div>
      <div>
        <Label htmlFor="rm-subject">Betreff / Grund</Label>
        <input id="rm-subject" name="subject" required maxLength={200} placeholder="z. B. Rückruf – nicht erreicht" className={inputCls} />
      </div>
      <div>
        <Label htmlFor="rm-assignee">Verantwortlich</Label>
        <select id="rm-assignee" name="assigneeId" defaultValue={defaultAssigneeId} className={inputCls}>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Wird gespeichert …" : "Wiedervorlage anlegen"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function Collapsible({ summary, children, defaultOpen }: { summary: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border border-line bg-white">
      <summary className="cursor-pointer select-none px-4 py-3 font-display text-[0.95rem] font-bold text-ink transition-colors hover:bg-paper-warm group-open:border-b group-open:border-line-soft">
        {summary}
      </summary>
      <div className="p-4">{children}</div>
    </details>
  );
}

export { formatDateTime };
