import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/academy", "/api", "/danke", "/empfehlen/danke"],
      },
    ],
    sitemap: `${env.baseUrl}/sitemap.xml`,
  };
}
