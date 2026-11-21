import { indeedFeed } from "@/lib/feeds/indeed";
import { allPublicJobs } from "@/lib/jobs/public";
import { siteUrl } from "@/lib/site";

// Built per request, cached by the CDN for 15 minutes: filled vacancies drop out well within an hour (F11).
export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = await allPublicJobs();
  return new Response(indeedFeed(jobs, siteUrl()), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=900, stale-while-revalidate=60" },
  });
}
