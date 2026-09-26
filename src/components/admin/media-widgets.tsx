"use client";

import { useActionState, useRef, useEffect } from "react";
import { uploadMediaAction, updateMediaAction, deleteMediaAction } from "@/app/actions/admin-media";
import type { ActionResult } from "@/app/actions/admin-candidates";
import { inputCls, Label } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export function MediaUploadForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(uploadMediaAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 md:grid-cols-4">
      <div>
        <Label htmlFor="mu-file">Datei (JPG, PNG, WebP, PDF – max. 10 MB)</Label>
        <input id="mu-file" name="file" type="file" required accept=".jpg,.jpeg,.png,.webp,.pdf" className={inputCls} />
      </div>
      <div>
        <Label htmlFor="mu-alt">Alt-Text</Label>
        <input id="mu-alt" name="alt" maxLength={300} className={inputCls} placeholder="Was ist zu sehen?" />
      </div>
      <div>
        <Label htmlFor="mu-cat">Kategorie</Label>
        <select id="mu-cat" name="category" defaultValue="POS" className={inputCls}>
          <option value="POS">PoS-Fotografie</option>
          <option value="TEAM">Team</option>
          <option value="BRAND">Marke/Logo</option>
          <option value="TRAINING">Academy/Schulung</option>
          <option value="SONSTIGE">Sonstige</option>
        </select>
      </div>
      <div>
        <Label htmlFor="mu-vis">Sichtbarkeit</Label>
        <select id="mu-vis" name="visibility" defaultValue="PUBLIC" className={inputCls}>
          <option value="PUBLIC">Öffentlich (Website)</option>
          <option value="INTERNAL">Intern (Academy/Admin)</option>
        </select>
      </div>
      <div className="md:col-span-4">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Wird hochgeladen …" : "Hochladen"}
        </Button>
        {state?.error ? (
          <p role="alert" className="mt-2 border-l-2 border-danger bg-danger-wash px-3 py-1.5 text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        {state?.ok ? (
          <p role="status" className="mt-2 text-sm font-semibold text-positive">
            Hochgeladen – Status: „Freigabe erforderlich“.
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function MediaEditForm({
  asset,
}: {
  asset: {
    id: string;
    alt: string;
    description: string;
    credit: string;
    approval: string;
    category: string;
    focalX: number;
    focalY: number;
  };
}) {
  return (
    <div className="space-y-2.5">
      <form action={updateMediaAction} className="space-y-2.5">
        <input type="hidden" name="id" value={asset.id} />
        <input name="alt" defaultValue={asset.alt} placeholder="Alt-Text" aria-label="Alt-Text" className={inputCls} />
        <input name="description" defaultValue={asset.description} placeholder="Interne Beschreibung" aria-label="Interne Beschreibung" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <input name="credit" defaultValue={asset.credit} placeholder="Urheber/Rechte (optional)" aria-label="Urheber" className={inputCls} />
          <select name="category" defaultValue={asset.category} aria-label="Kategorie" className={inputCls}>
            <option value="POS">PoS</option>
            <option value="TEAM">Team</option>
            <option value="BRAND">Marke</option>
            <option value="TRAINING">Academy</option>
            <option value="SONSTIGE">Sonstige</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select name="approval" defaultValue={asset.approval} aria-label="Freigabestatus" className={inputCls}>
            <option value="FREIGABE_ERFORDERLICH">Freigabe erforderlich</option>
            <option value="FREIGEGEBEN">Freigegeben</option>
            <option value="GESPERRT">Gesperrt</option>
          </select>
          <label className="flex items-center gap-1 text-xs text-ink-mute">
            Fokus X
            <input name="focalX" type="number" min={0} max={1} step={0.1} defaultValue={asset.focalX} className={inputCls} />
          </label>
          <label className="flex items-center gap-1 text-xs text-ink-mute">
            Y
            <input name="focalY" type="number" min={0} max={1} step={0.1} defaultValue={asset.focalY} className={inputCls} />
          </label>
        </div>
        <button type="submit" className="rounded-[2px] bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-deep">
          Speichern
        </button>
      </form>
      <form
        action={deleteMediaAction}
        onSubmit={(e) => {
          if (!confirm("Dieses Medium wirklich löschen? Verwendete Stellen zeigen danach kein Bild mehr.")) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={asset.id} />
        <button type="submit" className="text-sm font-medium text-danger hover:underline">
          Löschen
        </button>
      </form>
    </div>
  );
}
