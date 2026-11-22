import { channel } from "@/lib/feeds/channels";
import { jobsForChannel } from "@/lib/feeds/settings";
import { indeedFormatFeed, linkedinFeed } from "@/lib/feeds/xml";
import { siteUrl } from "@/lib/site";

// One XML feed per free channel: /feeds/indeed.xml, /feeds/jooble.xml, /feeds/linkedin.xml, …
// Switched-off channels return an empty feed, so the portal drops the jobs on its next crawl.
// Cached by the CDN for 15 minutes: filled vacancies disappear well within an hour (F11).
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ feed: string }> }) {
  const m = (await params).feed.match(/^([a-z0-9_]+)\.xml$/);
  const c = m ? channel(m[1]) : null;
  if (!c || c.via !== "feed") return new Response("Not found", { status: 404 });
  const jobs = await jobsForChannel(c.key);
  const xml = c.format === "linkedin" ? linkedinFeed(jobs, siteUrl()) : indeedFormatFeed(jobs, siteUrl(), c.key);
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=900, stale-while-revalidate=60" },
  });
}
