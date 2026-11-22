import { descriptionHtml, jobPath, type PublicJob } from "@/lib/jobs/format";
import { feedLink, type ChannelKey } from "./channels";

// Feed formats. Most aggregators read the Indeed XML format; LinkedIn has its own.

const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
const JOBTYPE: Record<string, string> = {
  full_time: "fulltime", part_time: "parttime", mini_job: "parttime", working_student: "internship", apprenticeship: "apprenticeship", freelance: "contract",
};
const PERIOD: Record<string, string> = { year: "per year", month: "per month", hour: "per hour" };
const LI_TYPE: Record<string, string> = {
  full_time: "FULL_TIME", part_time: "PART_TIME", mini_job: "PART_TIME", working_student: "INTERNSHIP", apprenticeship: "OTHER", freelance: "CONTRACT",
};

export function indeedFormatFeed(jobs: PublicJob[], siteUrl: string, key: ChannelKey, now = new Date()): string {
  const items = jobs.map((j) => {
    const salary = j.salaryMin !== null && j.salaryMax !== null ? `${j.salaryMin}-${j.salaryMax} EUR ${PERIOD[j.salaryPeriod]}` : "";
    return [
      "<job>",
      `<title>${cdata(j.title)}</title>`,
      `<date>${cdata(new Date(j.publishedAt).toUTCString())}</date>`,
      `<referencenumber>${cdata(j.id)}</referencenumber>`,
      `<url>${cdata(feedLink(`${siteUrl}${jobPath(j)}`, key))}</url>`,
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

export function linkedinFeed(jobs: PublicJob[], siteUrl: string, now = new Date()): string {
  const items = jobs.map((j) => [
    "<job>",
    `<partnerJobId>${cdata(j.id)}</partnerJobId>`,
    `<company>${cdata(j.employerName ?? "recrewted")}</company>`,
    `<title>${cdata(j.title)}</title>`,
    `<description>${cdata(descriptionHtml(j.briefing, j.adText, j.tone))}</description>`,
    `<applyUrl>${cdata(feedLink(`${siteUrl}${jobPath(j)}`, "linkedin"))}</applyUrl>`,
    `<location>${cdata(j.remote ? "Germany" : `${j.location ?? ""}, Germany`)}</location>`,
    j.remote ? "" : `<city>${cdata(j.location ?? "")}</city>`,
    j.remote ? "" : `<postalCode>${cdata(j.postalCode ?? "")}</postalCode>`,
    "<country>DE</country>",
    `<workplaceTypes>${j.remote ? "Remote" : j.briefing.remote === "hybrid" ? "Hybrid" : "On-site"}</workplaceTypes>`,
    j.employmentType ? `<jobtype>${LI_TYPE[j.employmentType]}</jobtype>` : "",
    `<listDate>${cdata(new Date(j.publishedAt).toISOString())}</listDate>`,
    "</job>",
  ].filter(Boolean).join(""));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<source><lastBuildDate>${now.toUTCString()}</lastBuildDate><publisherUrl>${cdata(siteUrl)}</publisherUrl><publisher>recrewted</publisher><expectedJobCount>${jobs.length}</expectedJobCount>${items.join("\n")}</source>\n`;
}
