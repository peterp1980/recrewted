// Weekly customer report: numbers per vacancy. Pure functions; loading lives in load.ts.
import { daysBetween } from "@/lib/kpis";

export type ReportVacancy = {
  title: string;
  status: string;
  applications: number;
  newThisWeek: number;
  qualified: number;
  shortlisted: number;
  hired: number;
  costPerQualified: number | null;
  publishedAt: string | null;
  firstShortlistAt: string | null;
};
export type WeeklyReport = { organization: string; from: string; to: string; vacancies: ReportVacancy[] };

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const one = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

/** Days from publication to the first shortlisted candidate, or null. */
export const timeToShortlist = (v: Pick<ReportVacancy, "publishedAt" | "firstShortlistAt">) =>
  v.publishedAt && v.firstShortlistAt ? daysBetween(v.publishedAt, v.firstShortlistAt) : null;

/** One plain line per vacancy, used in the e-mail and the PDF. */
export function vacancyLine(v: ReportVacancy): string {
  const parts = [
    `${v.applications} Bewerbungen${v.newThisWeek ? ` (+${v.newThisWeek} diese Woche)` : ""}`,
    `${v.qualified} passend`,
    `${v.shortlisted} vorgestellt`,
    ...(v.hired ? [`${v.hired} eingestellt`] : []),
  ];
  const tts = timeToShortlist(v);
  if (tts !== null) parts.push(`erste Shortlist nach ${one.format(tts)} Tagen`);
  if (v.costPerQualified !== null) parts.push(`${eur.format(v.costPerQualified)} pro passendem Kandidaten`);
  return parts.join(" · ");
}

/** Only worth sending when something is running or happened this week. */
export const worthSending = (r: WeeklyReport) => r.vacancies.some((v) => v.status === "active" || v.newThisWeek > 0);
