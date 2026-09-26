"use client";

import { useActionState } from "react";
import { saveCmsDraftAction, type CmsActionState } from "@/app/actions/admin-cms";
import type { CmsPageDef, CmsPageContent, CmsImageValue, CmsPairValue } from "@/lib/cms-schema";
import { inputCls, Label } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export function CmsEditor({
  slug,
  def,
  content,
  canPublish,
}: {
  slug: string;
  def: CmsPageDef;
  content: CmsPageContent;
  canPublish: boolean;
}) {
  const [state, formAction, pending] = useActionState<CmsActionState, FormData>(saveCmsDraftAction, null);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="slug" value={slug} />

      {state?.error ? (
        <p role="alert" className="border-l-2 border-danger bg-danger-wash px-4 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="border-l-2 border-positive bg-positive-wash px-4 py-2.5 text-sm text-positive">
          Gespeichert.
        </p>
      ) : null}

      {Object.entries(def.sections).map(([sectionKey, section]) => (
        <fieldset key={sectionKey} className="border border-line bg-white">
          <legend className="sr-only">{section.title}</legend>
          <div className="border-b border-line-soft bg-paper-warm px-4 py-2.5">
            <h2 className="font-display text-[0.95rem] font-bold text-ink">{section.title}</h2>
          </div>
          <div className="space-y-4 p-4">
            {Object.entries(section.fields).map(([fieldKey, field]) => {
              const name = `${sectionKey}.${fieldKey}`;
              const value = content[sectionKey]?.[fieldKey];
              const id = `cms-${sectionKey}-${fieldKey}`;
              switch (field.type) {
                case "text":
                  return (
                    <div key={fieldKey}>
                      <Label htmlFor={id}>{field.label}</Label>
                      <input id={id} name={name} defaultValue={typeof value === "string" ? value : ""} className={inputCls} />
                      {field.help ? <Help text={field.help} /> : null}
                    </div>
                  );
                case "textarea":
                case "richtext":
                  return (
                    <div key={fieldKey}>
                      <Label htmlFor={id}>{field.label}</Label>
                      <textarea
                        id={id}
                        name={name}
                        rows={field.type === "richtext" ? 10 : 3}
                        defaultValue={typeof value === "string" ? value : ""}
                        className={inputCls}
                      />
                      {field.help ? <Help text={field.help} /> : null}
                    </div>
                  );
                case "list": {
                  const list = Array.isArray(value) ? (value as string[]) : [];
                  return (
                    <div key={fieldKey}>
                      <Label htmlFor={id}>{field.label} (ein Eintrag pro Zeile)</Label>
                      <textarea id={id} name={name} rows={Math.max(3, list.length + 1)} defaultValue={list.join("\n")} className={inputCls} />
                      {field.help ? <Help text={field.help} /> : null}
                    </div>
                  );
                }
                case "pairs": {
                  const pairs = Array.isArray(value) ? (value as CmsPairValue[]) : [];
                  return (
                    <div key={fieldKey}>
                      <Label htmlFor={id}>{field.label} (Format: links :: rechts, ein Paar pro Zeile)</Label>
                      <textarea
                        id={id}
                        name={name}
                        rows={Math.max(3, pairs.length + 1)}
                        defaultValue={pairs.map((p) => `${p.a} :: ${p.b}`).join("\n")}
                        className={inputCls}
                      />
                      {field.help ? <Help text={field.help} /> : null}
                    </div>
                  );
                }
                case "image": {
                  const img = (value ?? { src: "", alt: "" }) as CmsImageValue;
                  return (
                    <div key={fieldKey} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                      <div>
                        <Label htmlFor={id}>{field.label} – Bildpfad</Label>
                        <input id={id} name={name} defaultValue={img.src} placeholder="/photos/… oder /media/…" className={inputCls} />
                      </div>
                      <div>
                        <Label htmlFor={`${id}-alt`}>Alt-Text (Barrierefreiheit)</Label>
                        <input id={`${id}-alt`} name={`${name}.alt`} defaultValue={img.alt} className={inputCls} />
                      </div>
                      {img.src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img.src} alt="" className="h-16 w-24 self-end object-cover" />
                      ) : (
                        <div className="h-16 w-24 self-end border border-dashed border-line" aria-hidden="true" />
                      )}
                      {field.help ? <Help text={field.help} /> : null}
                    </div>
                  );
                }
              }
            })}
          </div>
        </fieldset>
      ))}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-line bg-paper-warm/95 py-3 backdrop-blur">
        <Button type="submit" name="publish" value="0" variant="outline" disabled={pending}>
          Als Entwurf speichern
        </Button>
        {canPublish ? (
          <Button type="submit" name="publish" value="1" disabled={pending}>
            {pending ? "Wird gespeichert …" : "Speichern & veröffentlichen"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function Help({ text }: { text: string }) {
  return <p className="mt-1 text-xs text-ink-mute">{text}</p>;
}
