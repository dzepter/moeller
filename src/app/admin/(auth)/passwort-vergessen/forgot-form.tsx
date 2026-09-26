"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { inputCls, Label } from "@/components/admin/ui";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(requestPasswordResetAction, null);
  const submitted = state !== null && !state.error;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Image src="/brand/moeller-logo-white.png" alt="Möller GmbH" width={969} height={397} className="h-12 w-auto" priority />
        </div>
        <div className="mt-8 border border-white/10 bg-white p-6 shadow-2xl">
          <h1 className="font-display text-xl font-bold text-ink">Passwort vergessen</h1>
          {submitted || state?.error === "" ? (
            <p className="mt-4 border-l-2 border-positive bg-positive-wash px-3 py-2 text-sm text-positive">
              Wenn ein Konto mit dieser E-Mail existiert, haben wir soeben einen Link zum Zurücksetzen
              gesendet (gültig für 60 Minuten).
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-mute">
                Gib Deine E-Mail-Adresse ein – wir senden Dir einen Link zum Zurücksetzen.
              </p>
              {state?.error ? (
                <p role="alert" className="mt-4 border-l-2 border-danger bg-danger-wash px-3 py-2 text-sm text-danger">
                  {state.error}
                </p>
              ) : null}
              <form action={formAction} className="mt-5 space-y-4">
                <div>
                  <Label htmlFor="fp-email">E-Mail</Label>
                  <input id="fp-email" name="email" type="email" required autoComplete="username" className={inputCls} />
                </div>
                <Button type="submit" disabled={pending} className="w-full" size="lg">
                  {pending ? "Wird gesendet …" : "Link anfordern"}
                </Button>
              </form>
            </>
          )}
          <p className="mt-4 text-center text-sm">
            <Link href="/admin/login" className="prose-link">
              Zurück zur Anmeldung
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
