"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";

const jobSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Bitte einen Titel angeben.").max(120),
  slug: z.string().trim().max(120).optional(),
  bundesland: z.enum(["NRW", "HESSEN", "RHEINLAND_PFALZ", "BAYERN"]),
  city: z.string().trim().min(2, "Bitte Ort/Region angeben.").max(120),
  plz: z.string().trim().max(5).optional(),
  einsatzbereich: z.enum(["LEH", "ELEKTROFACHMARKT", "MESSEN_EVENTS", "POS_BETREUUNG"]),
  employmentType: z.enum(["VOLLZEIT", "TEILZEIT", "MINIJOB", "SELBSTSTAENDIG"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  intro: z.string().trim().min(10, "Bitte eine Kurzbeschreibung angeben.").max(600),
  descriptionText: z.string().max(6000).optional(),
  tasks: z.string().max(4000),
  requirements: z.string().max(4000),
  benefits: z.string().max(4000),
  contactName: z.string().trim().max(120).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  publishAt: z.string().optional(),
  expiresAt: z.string().optional(),
  autoDeactivate: z.string().optional(),
  driversLicense: z.enum(["ERFORDERLICH", "VON_VORTEIL", "NICHT_NOTWENDIG"]),
  ownCar: z.enum(["ERFORDERLICH", "VON_VORTEIL", "NICHT_NOTWENDIG"]),
  cvUploadEnabled: z.string().optional(),
  indexable: z.string().optional(),
});

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean);
}

export type JobFormState = { errors?: Record<string, string>; formError?: string; savedId?: string } | null;

export async function saveJobAction(_prev: JobFormState, formData: FormData): Promise<JobFormState> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "jobs.manage")) return { formError: "Keine Berechtigung." };

  const parsed = jobSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }
  const d = parsed.data;

  let slug = d.slug ? slugify(d.slug) : slugify(d.title);
  const clash = await db.job.findFirst({ where: { slug, ...(d.id ? { id: { not: d.id } } : {}) } });
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const data = {
    title: d.title,
    slug,
    bundesland: d.bundesland,
    city: d.city,
    plz: d.plz || null,
    einsatzbereich: d.einsatzbereich,
    employmentType: d.employmentType,
    startDate: d.startDate ? new Date(d.startDate) : null,
    endDate: d.endDate ? new Date(d.endDate) : null,
    intro: d.intro,
    description: { text: d.descriptionText ?? "" },
    tasks: lines(d.tasks),
    requirements: lines(d.requirements),
    benefits: lines(d.benefits),
    contactName: d.contactName || null,
    contactPhone: d.contactPhone || null,
    publishAt: d.publishAt ? new Date(d.publishAt) : null,
    expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
    autoDeactivate: d.autoDeactivate === "on",
    driversLicense: d.driversLicense,
    ownCar: d.ownCar,
    cvUploadEnabled: d.cvUploadEnabled === "on",
    indexable: d.indexable === "on",
  };

  let jobId: string;
  if (d.id) {
    await db.job.update({ where: { id: d.id }, data });
    jobId = d.id;
    await audit({ action: "job.updated", actorId: user.id, entityType: "Job", entityId: jobId, meta: { slug } });
  } else {
    const job = await db.job.create({ data: { ...data, createdById: user.id } });
    jobId = job.id;
    await audit({ action: "job.created", actorId: user.id, entityType: "Job", entityId: jobId, meta: { slug } });
  }
  revalidatePath("/admin/stellen");
  return { savedId: jobId };
}

export async function jobTransitionAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "jobs.manage")) return;
  const id = String(formData.get("id") ?? "");
  const to = String(formData.get("to") ?? "");
  const job = await db.job.findUnique({ where: { id } });
  if (!job) return;

  if (to === "VEROEFFENTLICHT") {
    await db.job.update({
      where: { id },
      data: { status: "VEROEFFENTLICHT", publishedAt: job.publishedAt ?? new Date(), publishAt: null },
    });
    await audit({ action: "job.published", actorId: user.id, entityType: "Job", entityId: id });
  } else if (to === "PAUSIERT" || to === "ARCHIVIERT" || to === "ENTWURF") {
    await db.job.update({ where: { id }, data: { status: to } });
    await audit({
      action: to === "ARCHIVIERT" ? "job.archived" : "job.updated",
      actorId: user.id,
      entityType: "Job",
      entityId: id,
      meta: { status: to },
    });
  } else if (to === "DUPLIZIEREN") {
    const copy = await db.job.create({
      data: {
        title: `${job.title} (Kopie)`,
        slug: `${job.slug}-kopie-${Math.random().toString(36).slice(2, 6)}`,
        bundesland: job.bundesland,
        city: job.city,
        plz: job.plz,
        lat: job.lat,
        lng: job.lng,
        einsatzbereich: job.einsatzbereich,
        employmentType: job.employmentType,
        startDate: job.startDate,
        endDate: job.endDate,
        intro: job.intro,
        description: job.description as object,
        tasks: job.tasks,
        requirements: job.requirements,
        benefits: job.benefits,
        contactName: job.contactName,
        contactPhone: job.contactPhone,
        status: "ENTWURF",
        driversLicense: job.driversLicense,
        ownCar: job.ownCar,
        cvUploadEnabled: job.cvUploadEnabled,
        indexable: job.indexable,
        createdById: user.id,
      },
    });
    await audit({ action: "job.created", actorId: user.id, entityType: "Job", entityId: copy.id, meta: { duplicatedFrom: id } });
    revalidatePath("/admin/stellen");
    redirect(`/admin/stellen/${copy.id}`);
  }
  revalidatePath("/admin/stellen");
  revalidatePath(`/admin/stellen/${id}`);
}
