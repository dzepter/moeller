"use client";

import Image from "next/image";
import { useActionState } from "react";
import { changePasswordAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { inputCls, Label } from "@/components/admin/ui";

export function ChangeForm({ forced }: { forced: boolean }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(changePasswordAction, null);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Image src="/brand/moeller-logo-white.png" alt="Möller GmbH" width={969} height={397} className="h-12 w-auto" priority />
        </div>
        <div className="mt-8 border border-white/10 bg-white p-6 shadow-2xl">
          <h1 className="font-display text-xl font-bold text-ink">Passwort ändern</h1>
          {forced ? (
            <p className="mt-2 border-l-2 border-accent bg-warn-wash px-3 py-2 text-sm text-ink-soft">
              Bitte vergib zuerst ein eigenes Passwort, bevor es losgeht (mind. 10 Zeichen, Groß-/Kleinbuchstaben und Ziffer).
            </p>
          ) : null}
          {state?.error ? (
            <p role="alert" className="mt-4 border-l-2 border-danger bg-danger-wash px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          <form action={formAction} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="cp-current">Aktuelles Passwort</Label>
              <input id="cp-current" name="currentPassword" type="password" required autoComplete="current-password" className={inputCls} />
            </div>
            <div>
              <Label htmlFor="cp-new">Neues Passwort</Label>
              <input id="cp-new" name="newPassword" type="password" required autoComplete="new-password" className={inputCls} />
            </div>
            <div>
              <Label htmlFor="cp-confirm">Neues Passwort wiederholen</Label>
              <input id="cp-confirm" name="confirm" type="password" required autoComplete="new-password" className={inputCls} />
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
