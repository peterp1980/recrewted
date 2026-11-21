// Job alerts: which new jobs match a candidate's preferences (talent pool consent required).
import { CATEGORIES, EMPLOYMENT_TYPES, type Category, type EmploymentType } from "@/lib/briefing/schema";
import { distanceKm, type PublicJob } from "@/lib/jobs/format";

export type AlertPrefs = { categories: Category[]; types: EmploymentType[]; postalCode: string | null; radiusKm: number | null };

export const RADII = [10, 25, 50, 100] as const;
export const MAX_JOBS_PER_ALERT = 5;

const pick = <T extends string>(v: unknown, allowed: readonly T[]): T[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is T => typeof x === "string" && (allowed as readonly string[]).includes(x)))] : [];

export function parsePrefs(raw: unknown): AlertPrefs {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const plz = typeof r.postalCode === "string" && /^\d{5}$/.test(r.postalCode) ? r.postalCode : null;
  const radius = typeof r.radiusKm === "number" && (RADII as readonly number[]).includes(r.radiusKm) ? r.radiusKm : null;
  return { categories: pick(r.categories, CATEGORIES), types: pick(r.types, EMPLOYMENT_TYPES), postalCode: plz, radiusKm: plz ? (radius ?? 50) : null };
}

export function prefsFromForm(form: FormData): AlertPrefs {
  const radius = Number(form.get("radiusKm"));
  return parsePrefs({
    categories: form.getAll("categories"),
    types: form.getAll("types"),
    postalCode: String(form.get("postalCode") ?? "").trim(),
    radiusKm: Number.isFinite(radius) ? radius : null,
  });
}

/** First guess from the job someone applied for; they can change it in the profile. */
export function prefsFromJob(job: Pick<PublicJob, "category" | "employmentType" | "postalCode">): AlertPrefs {
  return parsePrefs({ categories: job.category ? [job.category] : [], types: job.employmentType ? [job.employmentType] : [], postalCode: job.postalCode, radiusKm: 50 });
}

/**
 * New jobs since `since` that fit the preferences and were not applied for. Empty preference lists
 * mean "any". The radius applies only when both sides have coordinates (postal codes imported).
 */
export function matchJobs(prefs: AlertPrefs, jobs: PublicJob[], opts: { since: Date; applied: Set<string>; origin: { lat: number; lng: number } | null }): PublicJob[] {
  return jobs
    .filter((j) => Date.parse(j.publishedAt) > opts.since.getTime())
    .filter((j) => !opts.applied.has(j.id))
    .filter((j) => prefs.categories.length === 0 || (j.category !== null && prefs.categories.includes(j.category)))
    .filter((j) => prefs.types.length === 0 || (j.employmentType !== null && prefs.types.includes(j.employmentType)))
    .filter((j) => {
      if (!opts.origin || !prefs.radiusKm || j.remote || j.latitude === null || j.longitude === null) return true;
      return distanceKm(opts.origin, { lat: j.latitude, lng: j.longitude }) <= prefs.radiusKm;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, MAX_JOBS_PER_ALERT);
}

export type PoolVacancy = { category: string | null; employmentType: string | null; latitude: number | null; longitude: number | null; remote: boolean };
export type PoolFit = { fits: boolean; distanceKm: number | null; categoryMatch: boolean };

/**
 * Does a talent pool candidate's wish list fit a vacancy? Same rules as the job alert:
 * empty lists mean "any", the radius counts only when both sides have coordinates.
 */
export function poolFit(prefs: AlertPrefs, v: PoolVacancy, origin: { lat: number; lng: number } | null): PoolFit {
  const categoryMatch = v.category !== null && prefs.categories.includes(v.category as Category);
  const catOk = prefs.categories.length === 0 || categoryMatch;
  const typeOk = prefs.types.length === 0 || (v.employmentType !== null && prefs.types.includes(v.employmentType as EmploymentType));
  const distance = origin && v.latitude !== null && v.longitude !== null ? Math.round(distanceKm(origin, { lat: v.latitude, lng: v.longitude })) : null;
  const radiusOk = v.remote || distance === null || !prefs.radiusKm || distance <= prefs.radiusKm;
  return { fits: catOk && typeOk && radiusOk, distanceKm: distance, categoryMatch };
}

/** Explicit category match first, then nearest, unknown distance last. */
export function comparePoolFit(a: PoolFit, b: PoolFit): number {
  if (a.categoryMatch !== b.categoryMatch) return a.categoryMatch ? -1 : 1;
  return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
}
