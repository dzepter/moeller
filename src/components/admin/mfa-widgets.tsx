"use client";

import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import {
  startMfaSetupAction,
  confirmMfaSetupAction,
  disableMfaAction,
  type MfaSetupState,
  type AuthState,
} from "@/app/actions/auth";
import { inputCls, Label } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export function MfaSetup() {
  const [setup, setSetup] = useState<MfaSetupState>(null);
  const [starting, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState<MfaSetupState, FormData>(confirmMfaSetupAction, null);

  if (state?.recoveryCodes) {
    return (
      <div className="space-y-3">
        <p className="border-l-2 border-positive bg-positive-wash px-3 py-2 text-sm font-semibold text-positive">
          Zwei-Faktor-Anmeldung ist jetzt aktiv.
        </p>
        <p className="text-[0.95rem]">
          <strong>Wichtig:</strong> Bewahre diese Recovery-Codes sicher auf (z. B. Passwortmanager).
          Jeder Code funktioniert genau einmal, falls Du keinen Zugriff auf Deine App hast. Sie werden
          nur jetzt angezeigt.
        </p>
        <ul className="grid grid-cols-2 gap-1.5 font-mono text-sm">
          {state.recoveryCodes.map((code) => (
            <li key={code} className="bg-paper-warm px-3 py-1.5">
              {code}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const active = state?.secretEnc ? state : setup;

  if (!active?.secretEnc) {
    return (
      <div>
        <p className="text-[0.95rem]">
          Schütze Dein Konto zusätzlich mit einer Authenticator-App (z. B. Google Authenticator,
          Microsoft Authenticator, 2FAS).
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-3"
          disabled={starting}
          onClick={() => startTransition(async () => setSetup(await startMfaSetupAction()))}
        >
          {starting ? "Wird vorbereitet …" : "Einrichtung starten"}
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="secretEnc" value={active.secretEnc} />
      <input type="hidden" name="otpAuthUrl" value={active.otpAuthUrl ?? ""} />
      <ol className="list-decimal space-y-2 pl-5 text-[0.95rem]">
        <li>Öffne Deine Authenticator-App und scanne diesen QR-Code:</li>
      </ol>
      {active.qrDataUrl ? (
        <Image src={active.qrDataUrl} alt="QR-Code für die Authenticator-App" width={220} height={220} unoptimized className="border border-line" />
      ) : null}
      {active.manualCode ? (
        <p className="text-sm text-ink-mute">
          Ohne Kamera: Schlüssel manuell eingeben – <code className="bg-paper-warm px-1.5 font-mono">{active.manualCode}</code>
        </p>
      ) : null}
      <div className="max-w-xs">
        <Label htmlFor="mfa-confirm">2. Gib den 6-stelligen Code aus der App ein</Label>
        <input id="mfa-confirm" name="code" inputMode="numeric" autoComplete="one-time-code" required className={inputCls + " font-mono tracking-[0.25em]"} />
      </div>
      {state?.error ? (
        <p role="alert" className="border-l-2 border-danger bg-danger-wash px-3 py-1.5 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Wird geprüft …" : "2FA aktivieren"}
      </Button>
    </form>
  );
}

export function DisableMfaForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(disableMfaAction, null);
  if (state && !state.error) {
    return <p className="text-sm font-semibold text-positive">2FA wurde deaktiviert.</p>;
  }
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="mfa-dis-pass">Passwort zur Bestätigung</Label>
        <input id="mfa-dis-pass" name="password" type="password" required autoComplete="current-password" className={inputCls} />
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        2FA deaktivieren
      </Button>
      {state?.error ? (
        <p role="alert" className="w-full border-l-2 border-danger bg-danger-wash px-3 py-1.5 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
