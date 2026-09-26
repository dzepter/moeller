"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveJobAction, type JobFormState } from "@/app/actions/admin-jobs";
import { inputCls, Label, FormRow, Card } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export type JobFormData = {
  id?: string;
  title: string;
  slug: string;
  bundesland: string;
  city: string;
  plz: string;
  einsatzbereich: string;
  employmentType: string;
  startDate: string;
  endDate: string;
  intro: string;
  descriptionText: string;
  tasks: string;
  requirements: string;
  benefits: string;
  contactName: string;
  contactPhone: string;
  publishAt: string;
  expiresAt: string;
  autoDeactivate: boolean;
  driversLicense: string;
  ownCar: string;
  cvUploadEnabled: boolean;
  indexable: boolean;
};

export function JobForm({ job }: { job: JobFormData }) {
  const [state, formAction, pending] = useActionState<JobFormState, FormData>(saveJobAction, null);
  const router = useRouter();
  const errors = state?.errors ?? {};

  useEffect(() => {
    if (state?.savedId && !job.id) router.replace(`/admin/stellen/${state.savedId}`);
  }, [state?.savedId, job.id, router]);

  return (
    <form action={formAction} className="space-y-5">
      {job.id ? <input type="hidden" name="id" value={job.id} /> : null}
      {state?.formError ? (
        <p role="alert" className="border-l-2 border-danger bg-danger-wash px-4 py-2.5 text-sm text-danger">
          {state.formError}
        </p>
      ) : null}
      {state?.savedId ? (
        <p role="status" className="border-l-2 border-positive bg-positive-wash px-4 py-2.5 text-sm text-positive">
          Gespeichert.
        </p>
      ) : null}

      <Card title="Basisdaten">
        <div className="space-y-4">
          <FormRow>
            <div>
              <Label htmlFor="jf-title">Titel *</Label>
              <input id="jf-title" name="title" defaultValue={job.title} required className={inputCls} />
              <Err msg={errors.title} />
            </div>
            <div>
              <Label htmlFor="jf-slug">URL-Kürzel (leer = automatisch)</Label>
              <input id="jf-slug" name="slug" defaultValue={job.slug} className={inputCls} placeholder="z. B. promotor-leh-koeln" />
            </div>
          </FormRow>
          <FormRow cols={3}>
            <div>
              <Label htmlFor="jf-bundesland">Bundesland *</Label>
              <select id="jf-bundesland" name="bundesland" defaultValue={job.bundesland} className={inputCls}>
                <option value="NRW">Nordrhein-Westfalen</option>
                <option value="HESSEN">Hessen</option>
                <option value="RHEINLAND_PFALZ">Rheinland-Pfalz</option>
                <option value="BAYERN">Bayern</option>
              </select>
            </div>
            <div>
              <Label htmlFor="jf-city">Ort / Region *</Label>
              <input id="jf-city" name="city" defaultValue={job.city} required className={inputCls} />
              <Err msg={errors.city} />
            </div>
            <div>
              <Label htmlFor="jf-plz">PLZ (optional)</Label>
              <input id="jf-plz" name="plz" defaultValue={job.plz} maxLength={5} className={inputCls} />
            </div>
          </FormRow>
          <FormRow cols={3}>
            <div>
              <Label htmlFor="jf-bereich">Einsatzbereich *</Label>
              <select id="jf-bereich" name="einsatzbereich" defaultValue={job.einsatzbereich} className={inputCls}>
                <option value="LEH">Lebensmitteleinzelhandel</option>
                <option value="ELEKTROFACHMARKT">Elektrofachmarkt</option>
                <option value="MESSEN_EVENTS">Messen & Events</option>
                <option value="POS_BETREUUNG">PoS-Betreuung</option>
              </select>
            </div>
            <div>
              <Label htmlFor="jf-art">Beschäftigungsart *</Label>
              <select id="jf-art" name="employmentType" defaultValue={job.employmentType} className={inputCls}>
                <option value="VOLLZEIT">Vollzeit</option>
                <option value="TEILZEIT">Teilzeit</option>
                <option value="MINIJOB">Minijob</option>
                <option value="SELBSTSTAENDIG">Selbstständig / freiberuflich</option>
              </select>
            </div>
            <div>
              <Label htmlFor="jf-start">Startdatum (optional)</Label>
              <input id="jf-start" name="startDate" type="date" defaultValue={job.startDate} className={inputCls} />
            </div>
          </FormRow>
        </div>
      </Card>

      <Card title="Inhalte">
        <div className="space-y-4">
          <div>
            <Label htmlFor="jf-intro">Kurzbeschreibung (Einstieg) *</Label>
            <textarea id="jf-intro" name="intro" rows={3} defaultValue={job.intro} required className={inputCls} />
            <Err msg={errors.intro} />
          </div>
          <div>
            <Label htmlFor="jf-desc">Ausführliche Beschreibung (optional)</Label>
            <textarea id="jf-desc" name="descriptionText" rows={5} defaultValue={job.descriptionText} className={inputCls} />
            <p className="mt-1 text-xs text-ink-mute">
              Formatierung: Leerzeile = neuer Absatz · ## Zwischenüberschrift · **fett** · - Liste
            </p>
          </div>
          <FormRow cols={3}>
            <div>
              <Label htmlFor="jf-tasks">Aufgaben (eine pro Zeile) *</Label>
              <textarea id="jf-tasks" name="tasks" rows={6} defaultValue={job.tasks} className={inputCls} />
            </div>
            <div>
              <Label htmlFor="jf-req">Voraussetzungen (eine pro Zeile) *</Label>
              <textarea id="jf-req" name="requirements" rows={6} defaultValue={job.requirements} className={inputCls} />
            </div>
            <div>
              <Label htmlFor="jf-ben">Vorteile (einer pro Zeile) *</Label>
              <textarea id="jf-ben" name="benefits" rows={6} defaultValue={job.benefits} className={inputCls} />
            </div>
          </FormRow>
          <FormRow>
            <div>
              <Label htmlFor="jf-cname">Ansprechpartner (optional)</Label>
              <input id="jf-cname" name="contactName" defaultValue={job.contactName} className={inputCls} />
            </div>
            <div>
              <Label htmlFor="jf-cphone">Telefon Ansprechpartner (optional)</Label>
              <input id="jf-cphone" name="contactPhone" defaultValue={job.contactPhone} className={inputCls} />
            </div>
          </FormRow>
        </div>
      </Card>

      <Card title="Bewerbungsformular & Anforderungen">
        <div className="space-y-4">
          <FormRow cols={3}>
            <div>
              <Label htmlFor="jf-fs">Führerschein</Label>
              <select id="jf-fs" name="driversLicense" defaultValue={job.driversLicense} className={inputCls}>
                <option value="ERFORDERLICH">Erforderlich</option>
                <option value="VON_VORTEIL">Von Vorteil</option>
                <option value="NICHT_NOTWENDIG">Nicht notwendig</option>
              </select>
            </div>
            <div>
              <Label htmlFor="jf-car">Eigenes Auto</Label>
              <select id="jf-car" name="ownCar" defaultValue={job.ownCar} className={inputCls}>
                <option value="ERFORDERLICH">Erforderlich</option>
                <option value="VON_VORTEIL">Von Vorteil / optional</option>
                <option value="NICHT_NOTWENDIG">Nicht notwendig</option>
              </select>
              <p className="mt-1 text-xs text-ink-mute">Bei „erforderlich/optional“ wird im Formular danach gefragt.</p>
            </div>
            <div className="space-y-2.5 pt-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="cvUploadEnabled" defaultChecked={job.cvUploadEnabled} className="h-4 w-4 accent-brand" />
                Lebenslauf-Upload anbieten (optional für Bewerber)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="indexable" defaultChecked={job.indexable} className="h-4 w-4 accent-brand" />
                Für Suchmaschinen indexierbar
              </label>
            </div>
          </FormRow>
        </div>
      </Card>

      <Card title="Veröffentlichung">
        <FormRow cols={3}>
          <div>
            <Label htmlFor="jf-pub">Geplante Veröffentlichung (optional)</Label>
            <input id="jf-pub" name="publishAt" type="datetime-local" defaultValue={job.publishAt} className={inputCls} />
            <p className="mt-1 text-xs text-ink-mute">Wirkt nur bei Status „Entwurf“.</p>
          </div>
          <div>
            <Label htmlFor="jf-exp">Ablaufdatum (optional)</Label>
            <input id="jf-exp" name="expiresAt" type="datetime-local" defaultValue={job.expiresAt} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" name="autoDeactivate" defaultChecked={job.autoDeactivate} className="h-4 w-4 accent-brand" />
            Zum Ablaufdatum automatisch deaktivieren
          </label>
        </FormRow>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Wird gespeichert …" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1 text-sm font-medium text-danger">
      {msg}
    </p>
  );
}
