import { descriptionHtml, jobPath, type PublicJob } from "@/lib/jobs/format";
import { trackingLink } from "@/lib/campaigns/tracking";

// Indeed XML feed (F9). Also usable by other feed partners that read the Indeed format.

const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
const JOBTYPE: Record<string, string> = {
  full_time: "fulltime", part_time: "parttime", mini_job: "parttime", working_student: "internship", apprenticeship: "apprenticeship", freelance: "contract",
};
const PERIOD: Record<string, string> = { year: "per year", month: "per month", hour: "per hour" };

export function indeedFeed(jobs: PublicJob[], siteUrl: string, now = new Date()): string {
  const items = jobs.map((j) => {
    const url = trackingLink(`${siteUrl}${jobPath(j)}`, "indeed", "feed-indeed");
    const salary = j.salaryMin !== null && j.salaryMax !== null ? `${j.salaryMin}-${j.salaryMax} EUR ${PERIOD[j.salaryPeriod]}` : "";
    return [
      "<job>",
      `<title>${cdata(j.title)}</title>`,
      `<date>${cdata(new Date(j.publishedAt).toUTCString())}</date>`,
      `<referencenumber>${cdata(j.id)}</referencenumber>`,
      `<url>${cdata(url)}</url>`,
      `<company>${cdata(j.employerName ?? "recrewted")}</company>`,
      `<city>${cdata(j.remote ? "" : (j.location ?? ""))}</city>`,
      `<postalcode>${cdata(j.remote ? "" : (j.postalCode ?? ""))}</postalcode>`,
      "<country><![CDATA[DE]]></country>",
      j.remote ? "<remotetype><![CDATA[Fully remote]]></remotetype>" : "",
      `<description>${cdata(descriptionHtml(j.briefing, j.adText, j.tone))}</description>`,
      salary ? `<salary>${cdata(salary)}</salary>` : "",
      j.employmentType ? `<jobtype>${cdata(JOBTYPE[j.employmentType])}</jobtype>` : "",
      "</job>",
    ].filter(Boolean).join("");
  });
  return `<?xml version="1.0" encoding="utf-8"?>\n<source><publisher>recrewted</publisher><publisherurl>${cdata(siteUrl)}</publisherurl><lastBuildDate>${now.toUTCString()}</lastBuildDate>${items.join("\n")}</source>\n`;
}
