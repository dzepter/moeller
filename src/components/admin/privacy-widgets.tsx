"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  runRetentionAction,
  subjectSearchAction,
  anonymizeCandidateAction,
  type SubjectResult,
} from "@/app/actions/admin-privacy";
import type { ActionResult } from "@/app/actions/admin-candidates";
import { inputCls } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export function RetentionRunForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(runRetentionAction, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Alle fälligen Datensätze jetzt anonymisieren? Das kann nicht rückgängig gemacht werden.")) e.preventDefault();
      }}
    >
      <p className="text-[0.95rem]">
        Führt die konfigurierten Löschfristen sofort aus (statt auf den nächtlichen Lauf zu warten).
      </p>
      <Button type="submit" variant="danger" size="sm" className="mt-3" disabled={pending}>
        {pending ? "Läuft …" : "Fällige Löschungen ausführen"}
      </Button>
      {state?.ok ? (
        <p role="status" className="mt-2 text-sm font-semibold text-positive">
          {(state as { info?: string }).info ?? "Ausgeführt."}
        </p>
      ) : null}
      {state?.error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function SubjectSearch() {
  const [result, formAction, pending] = useActionState<SubjectResult, FormData>(subjectSearchAction, null);

  return (
    <div>
      <form action={formAction} className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Name, E-Mail oder Telefon</span>
          <input name="q" placeholder="Name, E-Mail oder Telefonnummer" className={inputCls} />
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          Suchen
        </Button>
      </form>

      {result ? (
        <div className="mt-4 space-y-4 text-[0.9rem]">
          <div>
            <p className="font-semibold text-ink">Bewerber ({result.candidates.length})</p>
            {result.candidates.length ? (
              <ul className="mt-1.5 space-y-2">
                {result.candidates.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft pb-2">
                    <span>
                      {c.name} · {c.city} · {c.email} · {c.phone} · {c.applications} Bewerbung(en)
                      {c.anonymized ? " · bereits anonymisiert" : ""}
                    </span>
                    {!c.anonymized ? (
                      <span className="flex gap-3">
                        <a href={`/api/admin/privacy/export/${c.id}`} className="prose-link">
                          Export (JSON)
                        </a>
                        <form
                          action={anonymizeCandidateAction}
                          onSubmit={(e) => {
                            if (!confirm(`${c.name} unwiderruflich anonymisieren?`)) e.preventDefault();
                          }}
                        >
                          <input type="hidden" name="candidateId" value={c.id} />
                          <button type="submit" className="font-medium text-danger hover:underline">
                            Anonymisieren
                          </button>
                        </form>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-mute">Keine Treffer.</p>
            )}
          </div>
          <div>
            <p className="font-semibold text-ink">Empfehlungen ({result.referrals.length})</p>
            {result.referrals.length ? (
              <ul className="mt-1.5 space-y-1">
                {result.referrals.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/empfehlungen/${r.id}`} className="prose-link">
                      {r.name}
                    </Link>{" "}
                    · {r.contact} · {r.status}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-mute">Keine Treffer.</p>
            )}
          </div>
          <div>
            <p className="font-semibold text-ink">Chats ({result.chats.length})</p>
            {result.chats.length ? (
              <ul className="mt-1.5 space-y-1">
                {result.chats.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/chats/${c.id}`} className="prose-link">
                      {c.name}
                    </Link>{" "}
                    · {c.contact}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-mute">Keine Treffer.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
