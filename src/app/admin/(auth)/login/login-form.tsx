"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { inputCls, Label } from "@/components/admin/ui";

export function LoginForm({ resetOk }: { resetOk?: boolean }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(loginAction, null);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Image src="/brand/moeller-logo-white.png" alt="Möller GmbH" width={969} height={397} className="h-12 w-auto" priority />
        </div>
        <div className="mt-8 border border-white/10 bg-white p-6 shadow-2xl">
          <h1 className="font-display text-xl font-bold text-ink">Interner Bereich</h1>
          <p className="mt-1 text-sm text-ink-mute">Anmeldung für Team &amp; Verwaltung</p>

          {resetOk ? (
            <p className="mt-4 border-l-2 border-positive bg-positive-wash px-3 py-2 text-sm text-positive">
              Passwort geändert – Du kannst Dich jetzt anmelden.
            </p>
          ) : null}
          {state?.error ? (
            <p role="alert" className="mt-4 border-l-2 border-danger bg-danger-wash px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          ) : null}

          <form action={formAction} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="login-email">E-Mail</Label>
              <input id="login-email" name="email" type="email" required autoComplete="username" className={inputCls} />
            </div>
            <div>
              <Label htmlFor="login-password">Passwort</Label>
              <input id="login-password" name="password" type="password" required autoComplete="current-password" className={inputCls} />
            </div>
            <Button type="submit" disabled={pending} className="w-full" size="lg">
              {pending ? "Wird geprüft …" : "Anmelden"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link href="/admin/passwort-vergessen" className="prose-link">
              Passwort vergessen?
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
