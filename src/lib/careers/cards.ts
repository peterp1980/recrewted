import { getMessages } from "@/i18n";
import { jobPath, salaryText, type PublicJob } from "@/lib/jobs/format";
import type { JobCard } from "@/components/career/CareerSections";

/** Job cards for the career page; links carry the entry point so applications count as "career page". */
export function jobCards(jobs: PublicJob[], linkSuffix = "?quelle=karriereseite"): JobCard[] {
  const types = getMessages().briefing.options.employmentType;
  return jobs.map((j) => ({
    id: j.id,
    title: j.title,
    href: `${jobPath(j)}${linkSuffix}`,
    location: j.remote ? getMessages().jobs.remote : j.location,
    type: j.employmentType ? types[j.employmentType] : null,
    salary: salaryText(j.salaryMin, j.salaryMax, j.salaryPeriod),
  }));
}
