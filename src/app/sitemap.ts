import type { MetadataRoute } from "next";
import { jobPath } from "@/lib/jobs/format";
import { allPublicJobs, careerSlugs } from "@/lib/jobs/public";
import { siteUrl } from "@/lib/site";

// Rebuilt at most every 15 minutes, so filled vacancies drop out well within the 1-hour limit (F11).
export const revalidate = 900;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  let jobs: Awaited<ReturnType<typeof allPublicJobs>> = [];
  let careers: string[] = [];
  try {
    [jobs, careers] = await Promise.all([allPublicJobs(), careerSlugs()]);
  } catch {
    // Without database access (e.g. local build) the sitemap lists static pages only.
  }
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/jobs`, changeFrequency: "hourly", priority: 0.9 },
    ...["leistungen", "pakete", "cases", "kontakt"].map((p) => ({ url: `${base}/${p}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...careers.map((c) => ({ url: `${base}/karriere/${c}`, changeFrequency: "daily" as const, priority: 0.7 })),
    ...jobs.map((j) => ({ url: `${base}${jobPath(j)}`, lastModified: j.publishedAt, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
