// Pure helpers for the public job board (F1): URLs, salary text, distance and
// the schema.org JobPosting for Google for Jobs.
import type { Briefing, Category, EmploymentType, SalaryPeriod } from "@/lib/briefing/schema";

export type PublicJob = {
  id: string;
  title: string;
  location: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  remote: boolean;
  employmentType: EmploymentType | null;
  category: Category | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: SalaryPeriod;
  publishedAt: string;
  employerName: string | null;
  employerWebsite: string | null;
  briefing: Briefing;
  /** Approved portal text (F8), shown instead of the briefing sections when present. */
  adText: string | null;
  /** How the employer addresses candidates in the form and mails. */
  tone: "sie" | "du";
};

const UMLAUTS: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => UMLAUTS[c])
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(m\/w\/d\)|\(w\/m\/d\)|\(d\/m\/w\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** /jobs/elektroniker-muenchen--<uuid>: readable, with the ID at the end. */
export function jobPath(job: Pick<PublicJob, "id" | "title" | "location">): string {
  const words = slugify([job.title, job.location].filter(Boolean).join(" "));
  return `/jobs/${words ? `${words}--` : ""}${job.id}`;
}

const UUID_AT_END = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
export function idFromSlug(slug: string): string | null {
  return slug.match(UUID_AT_END)?.[1]?.toLowerCase() ?? null;
}

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eurCents = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const PERIOD_TEXT: Record<SalaryPeriod, string> = { year: "pro Jahr", month: "pro Monat", hour: "pro Stunde" };

export function salaryText(min: number | null, max: number | null, period: SalaryPeriod): string | null {
  if (min === null || max === null) return null;
  const f = period === "hour" ? eurCents : eur;
  const range = min === max ? f.format(min) : `${f.format(min)} – ${f.format(max)}`;
  return `${range} ${PERIOD_TEXT[period]}`;
}

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const htmlList = (title: string, items: string[]) =>
  items.length ? `<h3>${escapeHtml(title)}</h3><ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>` : "";

/** Sections shown on the detail page and used as HTML description for Google. */
export function descriptionSections(b: Briefing): { title: string; items: string[] }[] {
  return [
    { title: "Ihre Aufgaben", items: b.tasks },
    { title: "Das bringen Sie mit", items: b.mustHave },
    { title: "Von Vorteil", items: b.niceToHave },
    { title: "Das bieten wir", items: b.benefits },
  ].filter((s) => s.items.length > 0);
}

export function descriptionHtml(b: Briefing, adText: string | null = null): string {
  if (adText) return adText.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");
  return descriptionSections(b).map((s) => htmlList(s.title, s.items)).join("");
}

const SCHEMA_EMPLOYMENT: Record<EmploymentType, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  mini_job: "PART_TIME",
  working_student: "INTERN",
  apprenticeship: "OTHER",
  freelance: "CONTRACTOR",
};
const SCHEMA_UNIT: Record<SalaryPeriod, string> = { year: "YEAR", month: "MONTH", hour: "HOUR" };

/** Postings stay valid this long after publication unless they are filled earlier (then they disappear). */
export const VALIDITY_DAYS = 60;

/** schema.org JobPosting for Google for Jobs. Only built for active vacancies with salary. */
export function jobPostingJsonLd(job: PublicJob, siteUrl: string): Record<string, unknown> {
  const validThrough = new Date(new Date(job.publishedAt).getTime() + VALIDITY_DAYS * 86_400_000).toISOString();
  const org = job.employerName
    ? { "@type": "Organization", name: job.employerName, ...(job.employerWebsite ? { sameAs: job.employerWebsite } : {}) }
    : { "@type": "Organization", name: "recrewted", sameAs: siteUrl };
  return {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: descriptionHtml(job.briefing, job.adText) || escapeHtml(job.title),
    identifier: { "@type": "PropertyValue", name: "recrewted", value: job.id },
    datePosted: job.publishedAt,
    validThrough,
    ...(job.employmentType ? { employmentType: SCHEMA_EMPLOYMENT[job.employmentType] } : {}),
    hiringOrganization: org,
    ...(job.remote
      ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "DE" } }
      : {
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: job.location ?? undefined,
              postalCode: job.postalCode ?? undefined,
              addressCountry: "DE",
            },
          },
        }),
    ...(job.salaryMin !== null && job.salaryMax !== null
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "EUR",
            value: { "@type": "QuantitativeValue", minValue: job.salaryMin, maxValue: job.salaryMax, unitText: SCHEMA_UNIT[job.salaryPeriod] },
          },
        }
      : {}),
    directApply: true,
    url: `${siteUrl}${jobPath(job)}`,
  };
}

/** Serializes JSON-LD safely for a <script> tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
