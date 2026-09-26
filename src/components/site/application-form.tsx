"use client";

import { useActionState, useEffect, useMemo } from "react";
import { applyAction, type ApplyState } from "@/app/actions/apply";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BUNDESLAENDER = [
  { value: "NRW", label: "Nordrhein-Westfalen" },
  { value: "HESSEN", label: "Hessen" },
  { value: "RHEINLAND_PFALZ", label: "Rheinland-Pfalz" },
  { value: "BAYERN", label: "Bayern" },
] as const;

type Props = {
  jobSlug?: string;
  jobBundesland?: string;
  askOwnCar?: boolean;
  cvUploadEnabled?: boolean;
  consentText: string;
};

/**
 * Bewerbungsformular „in 2 Minuten": nur Pflichtfelder aus Masterprompt §15,
 * keine Registrierung, kein Anschreiben. Serverseitig validiert (Zod).
 */
export function ApplicationForm({ jobSlug, jobBundesland, askOwnCar, cvUploadEnabled, consentText }: Props) {
  const [state, formAction, pending] = useActionState<ApplyState, FormData>(applyAction, null);
  // Zeitfalle gegen Bots: Zeitstempel beim ersten Rendern (bewusst impure, stabil per useMemo)
  // eslint-disable-next-line react-hooks/purity
  const startedAt = useMemo(() => Date.now().toString(), []);
  const errors = state?.errors ?? {};

  // Ereignis „Bewerbung gestartet" (cookieloser Beacon; serverseitig no-op, wenn Analytics aus)
  useEffect(() => {
    void fetch("/api/t", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ e: "bewerbung_gestartet" }),
    }).catch(() => undefined);
  }, []);

  return (
    <form action={formAction} noValidate className="space-y-5">
      {jobSlug ? <input type="hidden" name="jobSlug" value={jobSlug} /> : null}
      <input type="hidden" name="startedAt" value={startedAt} />
      {/* Honeypot */}
      <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state?.formError ? (
        <p role="alert" className="border-l-2 border-danger bg-danger-wash px-4 py-3 text-[0.95rem] text-danger">
          {state.formError}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Vorname *" name="firstName" error={errors.firstName} autoComplete="given-name" />
        <Field label="Nachname *" name="lastName" error={errors.lastName} autoComplete="family-name" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Wohnort *" name="city" error={errors.city} autoComplete="address-level2" />
        <div>
          <label htmlFor="f-bundesland" className="mb-1.5 block text-[0.95rem] font-semibold text-ink">
            Bundesland *
          </label>
          <select
            id="f-bundesland"
            name="bundesland"
            required
            defaultValue={jobBundesland ?? ""}
            aria-invalid={Boolean(errors.bundesland)}
            aria-describedby={errors.bundesland ? "e-bundesland" : undefined}
            className={inputCls(Boolean(errors.bundesland))}
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
          <FieldError id="e-bundesland" message={errors.bundesland} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <RadioGroup
          legend="Hast Du einen Führerschein? *"
          name="driversLicense"
          error={errors.driversLicense}
        />
        {askOwnCar ? (
          <RadioGroup legend="Hast Du ein eigenes Auto? *" name="ownCar" error={errors.ownCar} />
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Bisherige Tätigkeit *"
          name="previousActivity"
          error={errors.previousActivity}
          placeholder="z. B. Einzelhandel, Gastronomie, Quereinstieg …"
        />
        <Field
          label="Verfügbar ab *"
          name="availableFrom"
          error={errors.availableFrom}
          placeholder="z. B. sofort oder 01.11.2026"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Telefon *" name="phone" type="tel" error={errors.phone} autoComplete="tel" />
        <Field label="E-Mail *" name="email" type="email" error={errors.email} autoComplete="email" />
      </div>

      {cvUploadEnabled ? (
        <div>
          <label htmlFor="f-cv" className="mb-1.5 block text-[0.95rem] font-semibold text-ink">
            Lebenslauf (optional)
          </label>
          <input
            id="f-cv"
            name="cv"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            aria-describedby={errors.cv ? "e-cv" : "h-cv"}
            className="w-full rounded-[2px] border-[1.5px] border-line bg-white px-4 py-2.5 text-[0.95rem] file:mr-3 file:rounded-[2px] file:border-0 file:bg-paper-warm file:px-3 file:py-1.5 file:font-semibold"
          />
          <p id="h-cv" className="mt-1 text-sm text-ink-mute">
            PDF oder Bild, max. 10 MB – wirklich nur, wenn Du magst.
          </p>
          <FieldError id="e-cv" message={errors.cv} />
        </div>
      ) : null}

      <div>
        <label htmlFor="f-message" className="mb-1.5 block text-[0.95rem] font-semibold text-ink">
          Möchtest Du uns noch etwas sagen? (optional)
        </label>
        <textarea id="f-message" name="message" rows={3} maxLength={1000} className={inputCls(false)} />
      </div>

      <div className={cn("flex gap-3 border-l-2 py-1 pl-4", errors.consent ? "border-danger" : "border-line")}>
        <input id="f-consent" name="consent" type="checkbox" required aria-describedby={errors.consent ? "e-consent" : undefined} className="mt-1.5 h-4 w-4 accent-brand" />
        <label htmlFor="f-consent" className="text-[0.9rem] text-ink-soft">
          {consentText}{" "}
          <a href="/datenschutz" target="_blank" className="prose-link">
            Zu den Datenschutzhinweisen
          </a>
          .
        </label>
      </div>
      <FieldError id="e-consent" message={errors.consent} />

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:px-10">
        {pending ? "Wird gesendet …" : "Bewerbung absenden"}
      </Button>
      <p className="text-sm text-ink-mute">* Pflichtfeld · Kein Konto, kein Anschreiben nötig.</p>
    </form>
  );
}

function inputCls(hasError: boolean): string {
  return cn(
    "w-full rounded-[2px] border-[1.5px] bg-white px-4 py-2.5 text-ink placeholder:text-ink-mute focus:outline-none",
    hasError ? "border-danger" : "border-line focus:border-brand",
  );
}

function Field({
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
      <label htmlFor={`f-${name}`} className="mb-1.5 block text-[0.95rem] font-semibold text-ink">
        {label}
      </label>
      <input
        id={`f-${name}`}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `e-${name}` : undefined}
        className={inputCls(Boolean(error))}
      />
      <FieldError id={`e-${name}`} message={error} />
    </div>
  );
}

function RadioGroup({ legend, name, error }: { legend: string; name: string; error?: string }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[0.95rem] font-semibold text-ink">{legend}</legend>
      <div className="flex gap-3" role="radiogroup" aria-describedby={error ? `e-${name}` : undefined}>
        {(["ja", "nein"] as const).map((v) => (
          <label
            key={v}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[2px] border-[1.5px] border-line bg-white px-4 py-2.5 font-semibold text-ink transition-colors has-checked:border-brand has-checked:bg-brand has-checked:text-white hover:border-brand"
          >
            <input type="radio" name={name} value={v} className="sr-only" />
            {v === "ja" ? "Ja" : "Nein"}
          </label>
        ))}
      </div>
      <FieldError id={`e-${name}`} message={error} />
    </fieldset>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-danger">
      {message}
    </p>
  );
}
