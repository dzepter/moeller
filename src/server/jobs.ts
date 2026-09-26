import { db } from "@/lib/db";
import type { Bundesland, Beschaeftigungsart, Einsatzbereich, Prisma } from "@prisma/client";
import { plzToBundesland } from "@/lib/utils";

/** Öffentliche Job-Abfragen (nur veröffentlichte Stellen). */

export type JobFilter = {
  bundesland?: Bundesland;
  einsatzbereich?: Einsatzbereich;
  employmentType?: Beschaeftigungsart;
  q?: string;
  ort?: string; // PLZ oder Ortsname
};

export const EINSATZBEREICH_LABEL: Record<Einsatzbereich, string> = {
  LEH: "Lebensmitteleinzelhandel",
  ELEKTROFACHMARKT: "Elektrofachmarkt",
  MESSEN_EVENTS: "Messen & Events",
  POS_BETREUUNG: "PoS-Betreuung",
};

export const BESCHAEFTIGUNG_LABEL: Record<Beschaeftigungsart, string> = {
  VOLLZEIT: "Vollzeit",
  TEILZEIT: "Teilzeit",
  MINIJOB: "Minijob",
  SELBSTSTAENDIG: "Selbstständig / freiberuflich",
};

function publishedWhere(): Prisma.JobWhereInput {
  return {
    status: "VEROEFFENTLICHT",
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
}

export async function listPublishedJobs(filter: JobFilter = {}) {
  const where: Prisma.JobWhereInput = { ...publishedWhere() };
  if (filter.bundesland) where.bundesland = filter.bundesland;
  if (filter.einsatzbereich) where.einsatzbereich = filter.einsatzbereich;
  if (filter.employmentType) where.employmentType = filter.employmentType;

  const andConditions: Prisma.JobWhereInput[] = [];
  if (filter.q) {
    andConditions.push({
      OR: [
        { title: { contains: filter.q, mode: "insensitive" } },
        { city: { contains: filter.q, mode: "insensitive" } },
        { intro: { contains: filter.q, mode: "insensitive" } },
      ],
    });
  }
  if (filter.ort) {
    const ort = filter.ort.trim();
    const blFromPlz = /^\d{3,5}$/.test(ort) ? plzToBundesland(ort.padEnd(5, "0")) : null;
    if (blFromPlz) {
      andConditions.push({
        OR: [{ plz: { startsWith: ort.slice(0, 2) } }, { bundesland: blFromPlz }],
      });
    } else if (ort.length > 1) {
      andConditions.push({ city: { contains: ort, mode: "insensitive" } });
    }
  }
  if (andConditions.length) where.AND = andConditions;

  return db.job.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      city: true,
      bundesland: true,
      einsatzbereich: true,
      employmentType: true,
      startDate: true,
      intro: true,
      publishedAt: true,
    },
  });
}

export async function getPublishedJob(slug: string) {
  return db.job.findFirst({ where: { slug, ...publishedWhere() } });
}

/** Existiert der Slug, ist aber nicht (mehr) veröffentlicht? → für 410-Strategie */
export async function getUnpublishedJobStatus(slug: string) {
  const job = await db.job.findUnique({ where: { slug }, select: { status: true, expiresAt: true } });
  if (!job) return null;
  return job;
}

export async function featuredJobs(limit = 4) {
  return db.job.findMany({
    where: publishedWhere(),
    orderBy: [{ publishedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      city: true,
      bundesland: true,
      einsatzbereich: true,
      employmentType: true,
    },
  });
}
