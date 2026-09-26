"use client";

import { useActionState, useState } from "react";
import { createUserAction, updateUserAction, resetUserPasswordAction } from "@/app/actions/admin-users";
import type { ActionResult } from "@/app/actions/admin-candidates";
import { inputCls, Label } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

type Option = { id: string; name: string };

/**
 * Passwortfeld mit zugänglichem Anzeigen/Verbergen-Schalter.
 * Immer type="password" als Grundzustand + autocomplete="new-password",
 * damit Browser/Passwortmanager korrekt reagieren und nichts im Klartext
 * über die Schulter lesbar ist.
 */
function PasswordInput({ id, placeholder }: { id: string; placeholder?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name="password"
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        required
        className={`${inputCls} pr-20`}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-brand hover:text-brand-deep"
      >
        {visible ? "Verbergen" : "Anzeigen"}
      </button>
    </div>
  );
}

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

export function UserCreateForm({ roles, regions }: { roles: Option[]; regions: Option[] }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createUserAction, null);
  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-5">
      <div>
        <Label htmlFor="uc-name">Name</Label>
        <input id="uc-name" name="name" required className={inputCls} />
      </div>
      <div>
        <Label htmlFor="uc-email">E-Mail</Label>
        <input id="uc-email" name="email" type="email" required className={inputCls} />
      </div>
      <div>
        <Label htmlFor="uc-role">Rolle</Label>
        <select id="uc-role" name="roleId" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Bitte wählen
          </option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="uc-region">Region (für Teamleiter)</Label>
        <select id="uc-region" name="regionId" defaultValue="" className={inputCls}>
          <option value="">– keine –</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="uc-pass">Startpasswort</Label>
        <PasswordInput id="uc-pass" placeholder="mind. 10 Zeichen" />
      </div>
      <div className="md:col-span-5">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Wird angelegt …" : "Benutzer anlegen"}
        </Button>
        <span className="ml-3 text-xs text-ink-mute">Beim ersten Login muss das Passwort geändert werden.</span>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function UserEditRow({
  user,
  roles,
  regions,
}: {
  user: { id: string; name: string; roleId: string; regionId: string; active: boolean };
  roles: Option[];
  regions: Option[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(updateUserAction, null);
  const [resetState, resetAction, resetPending] = useActionState<ActionResult, FormData>(resetUserPasswordAction, null);
  const [showReset, setShowReset] = useState(false);

  return (
    <div className="space-y-3">
      <form action={formAction} className="grid items-end gap-3 md:grid-cols-5">
        <input type="hidden" name="userId" value={user.id} />
        <div>
          <Label htmlFor={`ue-name-${user.id}`}>Name</Label>
          <input id={`ue-name-${user.id}`} name="name" defaultValue={user.name} className={inputCls} />
        </div>
        <div>
          <Label htmlFor={`ue-role-${user.id}`}>Rolle</Label>
          <select id={`ue-role-${user.id}`} name="roleId" defaultValue={user.roleId} className={inputCls}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`ue-region-${user.id}`}>Region</Label>
          <select id={`ue-region-${user.id}`} name="regionId" defaultValue={user.regionId} className={inputCls}>
            <option value="">– keine –</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <input type="checkbox" name="active" defaultChecked={user.active} className="h-4 w-4 accent-brand" />
          Aktiv
        </label>
        <div className="flex gap-2 pb-0.5">
          <Button type="submit" size="sm" disabled={pending}>
            Speichern
          </Button>
          <button type="button" onClick={() => setShowReset((v) => !v)} className="prose-link text-sm">
            Passwort zurücksetzen
          </button>
        </div>
      </form>
      <Feedback state={state} />

      {showReset ? (
        <form action={resetAction} className="flex flex-wrap items-end gap-3 border-t border-line-soft pt-3">
          <input type="hidden" name="userId" value={user.id} />
          <div>
            <Label htmlFor={`ur-pass-${user.id}`}>Neues Startpasswort</Label>
            <PasswordInput id={`ur-pass-${user.id}`} />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={resetPending}>
            Zurücksetzen (alle Sitzungen enden)
          </Button>
          <Feedback state={resetState} />
        </form>
      ) : null}
    </div>
  );
}
