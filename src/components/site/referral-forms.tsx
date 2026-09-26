"use client";

import { useActionState, useState } from "react";
import {
  createReferralLinkAction,
  createDirectReferralAction,
  completeReferralSelfAction,
  type ReferralState,
} from "@/app/actions/referrals";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BUNDESLAENDER = [
  { value: "NRW", label: "Nordrhein-Westfalen" },
  { value: "HESSEN", label: "Hessen" },
  { value: "RHEINLAND_PFALZ", label: "Rheinland-Pfalz" },
  { value: "BAYERN", label: "Bayern" },
] as const;

function inputCls(hasError: boolean): string {
  return cn(
    "w-full rounded-[2px] border-[1.5px] bg-white px-4 py-2.5 text-ink placeholder:text-ink-mute focus:outline-none",
    hasError ? "border-danger" : "border-line focus:border-brand",
  );
}

function F({
  label,
  name,
  error,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  error?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={`r-${name}`} className="mb-1.5 block text-[0.95rem] font-semibold text-ink">
        {label}
      </label>
      <input
        id={`r-${name}`}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `re-${name}` : undefined}
        className={inputCls(Boolean(error))}
      />
      {error ? (
        <p id={`re-${name}`} role="alert" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Honeypot() {
  return (
    <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

function FormError({ state }: { state: ReferralState }) {
  if (!state?.formError) return null;
  return (
    <p role="alert" className="border-l-2 border-danger bg-danger-wash px-4 py-3 text-[0.95rem] text-danger">
      {state.formError}
    </p>
  );
}

function BundeslandSelect({ error }: { error?: string }) {
  return (
    <div>
      <label htmlFor="r-bundesland" className="mb-1.5 block text-[0.95rem] font-semibold text-ink">
        Bundesland *
      </label>
      <select
        id="r-bundesland"
        name="referredBundesland"
        defaultValue=""
        aria-invalid={Boolean(error)}
        className={inputCls(Boolean(error))}
      >
        <option value="" disabled>
          Bitte wählen
        </option>
        {BUNDESLAENDER.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Umschalter zwischen Variante A (Link) und Variante B (Direkt). */
export function ReferralTabs({ consentText }: { consentText: string }) {
  const [tab, setTab] = useState<"link" | "direkt">("link");
  return (
    <div>
      <div role="tablist" aria-label="Empfehlungsweg wählen" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(
          [
            { id: "link", title: "Empfehlungslink erstellen", sub: "Du gibst nur Deine eigenen Daten an und teilst den Link selbst." },
            { id: "direkt", title: "Kontaktdaten weitergeben", sub: "Nur, wenn die Person vorher zugestimmt hat." },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-[2px] border-[1.5px] p-4 text-left transition-colors",
              tab === t.id ? "border-brand bg-brand-wash" : "border-line bg-white hover:border-brand",
            )}
          >
            <span className="block font-display font-bold text-ink">{t.title}</span>
            <span className="mt-1 block text-sm text-ink-soft">{t.sub}</span>
          </button>
        ))}
      </div>

      <div id="panel-link" role="tabpanel" aria-labelledby="tab-link" hidden={tab !== "link"} className="mt-8">
        <ReferralLinkForm />
      </div>
      <div id="panel-direkt" role="tabpanel" aria-labelledby="tab-direkt" hidden={tab !== "direkt"} className="mt-8">
        <ReferralDirectForm consentText={consentText} />
      </div>
    </div>
  );
}

function ReferralLinkForm() {
  const [state, formAction, pending] = useActionState<ReferralState, FormData>(createReferralLinkAction, null);
  const errors = state?.errors ?? {};

  if (state?.link) {
    return (
      <div className="border-l-2 border-positive bg-positive-wash p-5">
        <p className="font-display text-lg font-bold text-ink">Dein persönlicher Empfehlungslink ist fertig!</p>
        <p className="mt-2 text-ink-soft">
          Schick ihn der Person, die Du empfehlen möchtest – per WhatsApp, SMS oder wie Du magst. Sie
          trägt dann selbst ihre Daten ein.
        </p>
        <p className="mt-4 break-all rounded-[2px] border border-line bg-white px-4 py-3 font-mono text-sm">{state.link}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <a
            className="prose-link"
            rel="noopener"
            target="_blank"
            href={`https://wa.me/?text=${encodeURIComponent(`Hallo! Ich arbeite mit Möller zusammen und glaube, das könnte was für Dich sein. Schau mal: ${state.link}`)}`}
          >
            Per WhatsApp teilen
          </a>
          <button type="button" className="prose-link cursor-pointer" onClick={() => navigator.clipboard.writeText(state.link ?? "")}>
            Link kopieren
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-5">
      <Honeypot />
      <FormError state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <F label="Dein Vorname *" name="referrerFirstName" error={errors.referrerFirstName} autoComplete="given-name" />
        <F label="Dein Nachname *" name="referrerLastName" error={errors.referrerLastName} autoComplete="family-name" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <F label="Deine Telefonnummer oder E-Mail *" name="referrerContact" error={errors.referrerContact} />
        <F label="Deine Promotor-/Mitarbeiternummer (optional)" name="referrerEmployeeNo" error={errors.referrerEmployeeNo} />
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Wird erstellt …" : "Empfehlungslink erstellen"}
      </Button>
      <p className="text-sm text-ink-mute">
        Datenschutzfreundlich: Du gibst keine Daten Dritter weiter – die empfohlene Person entscheidet selbst.
      </p>
    </form>
  );
}

function ReferralDirectForm({ consentText }: { consentText: string }) {
  const [state, formAction, pending] = useActionState<ReferralState, FormData>(createDirectReferralAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} noValidate className="space-y-8">
      <Honeypot />
      <FormError state={state} />

      <fieldset className="space-y-5">
        <legend className="font-display text-lg font-bold text-ink">Deine Daten (empfehlende Person)</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <F label="Dein Vorname *" name="referrerFirstName" error={errors.referrerFirstName} autoComplete="given-name" />
          <F label="Dein Nachname *" name="referrerLastName" error={errors.referrerLastName} autoComplete="family-name" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <F label="Deine Telefonnummer oder E-Mail *" name="referrerContact" error={errors.referrerContact} />
          <F label="Deine Promotor-/Mitarbeiternummer (optional)" name="referrerEmployeeNo" error={errors.referrerEmployeeNo} />
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-lg font-bold text-ink">Die Person, die Du empfiehlst</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <F label="Vorname *" name="referredFirstName" error={errors.referredFirstName} />
          <F label="Nachname *" name="referredLastName" error={errors.referredLastName} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <F label="Telefon *" name="referredPhone" type="tel" error={errors.referredPhone} />
          <F label="E-Mail *" name="referredEmail" type="email" error={errors.referredEmail} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <F label="Wohnort *" name="referredCity" error={errors.referredCity} />
          <BundeslandSelect error={errors.referredBundesland} />
        </div>
        <div>
          <label htmlFor="r-note" className="mb-1.5 block text-[0.95rem] font-semibold text-ink">
            Kurze Notiz (optional)
          </label>
          <textarea id="r-note" name="note" rows={3} maxLength={500} className={inputCls(false)} placeholder="z. B. woher ihr euch kennt oder was gut passen würde" />
        </div>
      </fieldset>

      <div className={cn("flex gap-3 border-l-2 py-1 pl-4", errors.consent ? "border-danger" : "border-line")}>
        <input id="r-consent" name="consent" type="checkbox" required className="mt-1.5 h-4 w-4 accent-brand" />
        <label htmlFor="r-consent" className="text-[0.9rem] text-ink-soft">
          {consentText}
        </label>
      </div>
      {errors.consent ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {errors.consent}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Wird gesendet …" : "Empfehlung absenden"}
      </Button>
    </form>
  );
}

/** Variante A, Schritt 2: Selbsteintrag der empfohlenen Person. */
export function ReferralSelfForm({ code, referrerFirstName }: { code: string; referrerFirstName: string }) {
  const [state, formAction, pending] = useActionState<ReferralState, FormData>(completeReferralSelfAction, null);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} noValidate className="space-y-5">
      <input type="hidden" name="code" value={code} />
      <Honeypot />
      <FormError state={state} />
      <p className="border-l-2 border-brand bg-brand-wash p-4 text-[0.95rem] text-ink-soft">
        {referrerFirstName} meint, ein Job bei Möller könnte gut zu Dir passen. Wenn Du magst, trag
        hier unverbindlich Deine Kontaktdaten ein – wir melden uns persönlich bei Dir.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <F label="Vorname *" name="firstName" error={errors.firstName} autoComplete="given-name" />
        <F label="Nachname *" name="lastName" error={errors.lastName} autoComplete="family-name" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <F label="Telefon *" name="phone" type="tel" error={errors.phone} autoComplete="tel" />
        <F label="E-Mail *" name="email" type="email" error={errors.email} autoComplete="email" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <F label="Wohnort *" name="city" error={errors.city} autoComplete="address-level2" />
        <div>
          <label htmlFor="rs-bundesland" className="mb-1.5 block text-[0.95rem] font-semibold text-ink">
            Bundesland *
          </label>
          <select id="rs-bundesland" name="bundesland" defaultValue="" aria-invalid={Boolean(errors.bundesland)} className={inputCls(Boolean(errors.bundesland))}>
            <option value="" disabled>
              Bitte wählen
            </option>
            {BUNDESLAENDER.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
          {errors.bundesland ? (
            <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
              {errors.bundesland}
            </p>
          ) : null}
        </div>
      </div>
      <div>
        <label htmlFor="rs-note" className="mb-1.5 block text-[0.95rem] font-semibold text-ink">
          Möchtest Du uns etwas mitgeben? (optional)
        </label>
        <textarea id="rs-note" name="note" rows={3} maxLength={500} className={inputCls(false)} />
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Wird gesendet …" : "Unverbindlich Kontakt aufnehmen"}
      </Button>
    </form>
  );
}
