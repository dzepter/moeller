"use client";

import { useActionState } from "react";
import { saveSettingsAction, saveTeamMemberAction, deleteTeamMemberAction } from "@/app/actions/admin-settings";
import type { ActionResult } from "@/app/actions/admin-candidates";
import { inputCls, Label } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Field = {
  name: string;
  label: string;
  value: string;
  help?: string;
  textarea?: boolean;
  wide?: boolean;
};

type Checkbox = { name: string; label: string; checked: boolean };

function Feedback({ state }: { state: ActionResult }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="mt-2 border-l-2 border-danger bg-danger-wash px-3 py-1.5 text-sm text-danger">
        {state.error}
      </p>
    );
  return (
    <p role="status" className="mt-2 border-l-2 border-positive bg-positive-wash px-3 py-1.5 text-sm text-positive">
      Gespeichert.
    </p>
  );
}

export function SettingsForm({
  section,
  fields,
  checkboxes = [],
}: {
  section: string;
  fields: Field[];
  checkboxes?: Checkbox[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(saveSettingsAction, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="section" value={section} />
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className={cn(field.wide && "md:col-span-2")}>
            <Label htmlFor={`set-${section}-${field.name}`}>{field.label}</Label>
            {field.textarea ? (
              <textarea id={`set-${section}-${field.name}`} name={field.name} rows={3} defaultValue={field.value} className={inputCls} />
            ) : (
              <input id={`set-${section}-${field.name}`} name={field.name} defaultValue={field.value} className={inputCls} />
            )}
            {field.help ? <p className="mt-1 text-xs text-ink-mute">{field.help}</p> : null}
          </div>
        ))}
        {checkboxes.length ? (
          <div className="space-y-2.5 md:col-span-2">
            {checkboxes.map((cb) => (
              <label key={cb.name} className="flex items-center gap-2.5 text-[0.95rem]">
                <input type="checkbox" name={cb.name} defaultChecked={cb.checked} className="h-4 w-4 accent-brand" />
                {cb.label}
              </label>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mt-4">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Wird gespeichert …" : "Speichern"}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function TeamMemberEditor({
  members,
}: {
  members: Array<{ id: string; name: string; role: string; bio: string; active: boolean; sortOrder: number }>;
}) {
  return (
    <div className="space-y-5">
      {members.map((member) => (
        <TeamMemberForm key={member.id} member={member} />
      ))}
      <div className="border-t border-line-soft pt-4">
        <p className="mb-2 text-sm font-semibold text-ink">Neues Teammitglied</p>
        <TeamMemberForm member={{ id: "", name: "", role: "", bio: "", active: true, sortOrder: members.length }} />
      </div>
    </div>
  );
}

function TeamMemberForm({
  member,
}: {
  member: { id: string; name: string; role: string; bio: string; active: boolean; sortOrder: number };
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(saveTeamMemberAction, null);
  return (
    <div>
      <form action={formAction} className="grid items-end gap-3 md:grid-cols-[1fr_1fr_2fr_auto_auto_auto]">
        <input type="hidden" name="id" value={member.id} />
        <input type="hidden" name="sortOrder" value={member.sortOrder} />
        <div>
          <Label htmlFor={`tm-name-${member.id || "neu"}`}>Name</Label>
          <input id={`tm-name-${member.id || "neu"}`} name="name" defaultValue={member.name} className={inputCls} />
        </div>
        <div>
          <Label htmlFor={`tm-role-${member.id || "neu"}`}>Funktion</Label>
          <input id={`tm-role-${member.id || "neu"}`} name="role" defaultValue={member.role} className={inputCls} />
        </div>
        <div>
          <Label htmlFor={`tm-bio-${member.id || "neu"}`}>Kurztext</Label>
          <input id={`tm-bio-${member.id || "neu"}`} name="bio" defaultValue={member.bio} className={inputCls} />
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <input type="checkbox" name="active" defaultChecked={member.active} className="h-4 w-4 accent-brand" />
          Aktiv
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          Speichern
        </Button>
        {member.id ? (
          <button
            type="submit"
            formAction={deleteTeamMemberAction}
            className="pb-2 text-sm font-medium text-danger hover:underline"
            onClick={(e) => {
              if (!confirm("Teammitglied wirklich löschen?")) e.preventDefault();
            }}
          >
            Löschen
          </button>
        ) : (
          <span />
        )}
      </form>
      <Feedback state={state} />
    </div>
  );
}
