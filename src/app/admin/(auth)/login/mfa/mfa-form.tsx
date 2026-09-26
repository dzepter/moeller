"use client";

import Image from "next/image";
import { useActionState } from "react";
import { mfaAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { inputCls, Label } from "@/components/admin/ui";

export function MfaForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(mfaAction, null);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Image src="/brand/moeller-logo-white.png" alt="Möller GmbH" width={969} height={397} className="h-12 w-auto" priority />
        </div>
        <div className="mt-8 border border-white/10 bg-white p-6 shadow-2xl">
          <h1 className="font-display text-xl font-bold text-ink">Zwei-Faktor-Bestätigung</h1>
          <p className="mt-1 text-sm text-ink-mute">
            Gib den 6-stelligen Code aus Deiner Authenticator-App ein – oder einen Deiner Recovery-Codes.
          </p>
          {state?.error ? (
            <p role="alert" className="mt-4 border-l-2 border-danger bg-danger-wash px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          <form action={formAction} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="mfa-code">Code</Label>
              <input
                id="mfa-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                className={inputCls + " text-center font-mono text-lg tracking-[0.3em]"}
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full" size="lg">
              {pending ? "Wird geprüft …" : "Bestätigen"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
