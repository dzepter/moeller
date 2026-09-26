"use client";

import Image from "next/image";
import { useActionState } from "react";
import { completePasswordResetAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { inputCls, Label } from "@/components/admin/ui";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(completePasswordResetAction, null);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Image src="/brand/moeller-logo-white.png" alt="Möller GmbH" width={969} height={397} className="h-12 w-auto" priority />
        </div>
        <div className="mt-8 border border-white/10 bg-white p-6 shadow-2xl">
          <h1 className="font-display text-xl font-bold text-ink">Neues Passwort vergeben</h1>
          <p className="mt-1 text-sm text-ink-mute">
            Mindestens 10 Zeichen, mit Groß- und Kleinbuchstaben und einer Ziffer.
          </p>
          {state?.error ? (
            <p role="alert" className="mt-4 border-l-2 border-danger bg-danger-wash px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          <form action={formAction} className="mt-5 space-y-4">
            <input type="hidden" name="token" value={token} />
            <div>
              <Label htmlFor="rp-new">Neues Passwort</Label>
              <input id="rp-new" name="newPassword" type="password" required autoComplete="new-password" className={inputCls} />
            </div>
            <div>
              <Label htmlFor="rp-confirm">Neues Passwort wiederholen</Label>
              <input id="rp-confirm" name="confirm" type="password" required autoComplete="new-password" className={inputCls} />
            </div>
            <Button type="submit" disabled={pending} className="w-full" size="lg">
              {pending ? "Wird gespeichert …" : "Passwort speichern"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
