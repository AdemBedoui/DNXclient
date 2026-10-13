import type { MetadataRoute } from "next"
import { POPULAR_DOMAINS, SITE_URL } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...POPULAR_DOMAINS.map((d) => ({
      url: `${SITE_URL}/${d}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ]
}
