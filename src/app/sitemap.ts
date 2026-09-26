import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    "",
    "/ueber-uns",
    "/fuer-unternehmen",
    "/arbeiten-bei-moeller",
    "/jobs",
    "/initiativbewerbung",
    "/empfehlen",
    "/kontakt",
    "/impressum",
    "/datenschutz",
  ].map((path) => ({
    url: `${env.baseUrl}${path}`,
    changeFrequency: path === "/jobs" ? ("daily" as const) : ("weekly" as const),
    priority: path === "" ? 1 : path === "/jobs" ? 0.9 : 0.7,
  }));

  const jobs = await db.job.findMany({
    where: {
      status: "VEROEFFENTLICHT",
      indexable: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { slug: true, updatedAt: true },
  });

  return [
    ...staticPages,
    ...jobs.map((job) => ({
      url: `${env.baseUrl}/jobs/${job.slug}`,
      lastModified: job.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
