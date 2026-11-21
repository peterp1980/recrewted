import "server-only";
import { fromStored } from "@/lib/briefing/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { distanceKm, type PublicJob } from "./format";
import { matchesText, type JobFilters } from "./filters";

// The job board is public, but vacancies are not: this module reads active
// vacancies with the service role and returns only public fields. Pricing,
// CRM IDs and internal status never leave the server.

const COLUMNS =
  "id, title, location, postal_code, latitude, longitude, remote, employment_type, category, salary_min, salary_max, salary_period, published_at, employer_visible, organizations(name, website), vacancy_briefings(data), job_ads(channel, status, body, version)";

type Row = {
  id: string; title: string; location: string | null; postal_code: string | null; latitude: number | null; longitude: number | null;
  remote: boolean; employment_type: string | null; category: string | null; salary_min: number | null; salary_max: number | null;
  salary_period: string; published_at: string | null; employer_visible: boolean;
  organizations: { name: string; website: string | null } | null; vacancy_briefings: { data: unknown } | null;
  job_ads: { channel: string; status: string; body: string; version: number }[] | null;
};

function toPublic(r: Row): PublicJob {
  const briefing = fromStored(r.vacancy_briefings?.data);
  return {
    id: r.id,
    title: r.title,
    location: r.location,
    postalCode: r.postal_code,
    latitude: r.latitude,
    longitude: r.longitude,
    remote: r.remote,
    employmentType: briefing.employmentType,
    category: briefing.category,
    salaryMin: r.salary_min === null ? null : Number(r.salary_min),
    salaryMax: r.salary_max === null ? null : Number(r.salary_max),
    salaryPeriod: briefing.salaryPeriod,
    publishedAt: r.published_at ?? new Date().toISOString(),
    employerName: r.employer_visible ? (r.organizations?.name ?? null) : null,
    employerWebsite: r.employer_visible ? (r.organizations?.website ?? null) : null,
    briefing,
    adText: (r.job_ads ?? []).filter((a) => a.channel === "portal" && a.status === "approved").sort((a, b) => b.version - a.version)[0]?.body ?? null,
  };
}

/** Active vacancies with salary (required for publication, F10). */
async function activeRows(): Promise<Row[]> {
  const { data, error } = await createAdminClient()
    .from("vacancies")
    .select(COLUMNS)
    .eq("status", "active")
    .not("salary_min", "is", null)
    .not("salary_max", "is", null)
    .order("published_at", { ascending: false });
  if (error) throw new Error(`job board query failed: ${error.message}`);
  return (data ?? []) as unknown as Row[];
}

export async function getPublicJob(id: string): Promise<PublicJob | null> {
  const { data } = await createAdminClient().from("vacancies").select(COLUMNS).eq("id", id).eq("status", "active").maybeSingle();
  if (!data || data.salary_min === null || data.salary_max === null) return null;
  return toPublic(data as unknown as Row);
}

export async function allPublicJobs(): Promise<PublicJob[]> {
  return (await activeRows()).map(toPublic);
}

/** Looks up a postal code or place name. Empty until postal codes are imported. */
export async function geocode(where: string): Promise<{ lat: number; lng: number; label: string } | null> {
  if (!where) return null;
  const admin = createAdminClient();
  const query = /^\d{5}$/.test(where)
    ? admin.from("postal_codes").select("code, place, latitude, longitude").eq("code", where).limit(1)
    : admin.from("postal_codes").select("code, place, latitude, longitude").ilike("place", where).limit(1);
  const { data } = await query;
  const p = data?.[0];
  return p ? { lat: p.latitude, lng: p.longitude, label: `${p.code} ${p.place}` } : null;
}

export type SearchResult = { jobs: (PublicJob & { distance: number | null })[]; total: number; origin: string | null; radiusApplied: boolean };

export const PAGE_SIZE = 20;

export async function searchJobs(f: JobFilters): Promise<SearchResult> {
  const [jobs, origin] = await Promise.all([allPublicJobs(), geocode(f.where)]);
  let list = jobs
    .filter((j) => !f.category || j.category === f.category)
    .filter((j) => !f.type || j.employmentType === f.type)
    .filter((j) => matchesText([j.title, j.location, j.employerName, ...j.briefing.tasks, ...j.briefing.mustHave].join(" "), f.q))
    .map((j) => ({
      ...j,
      distance: origin && j.latitude !== null && j.longitude !== null ? distanceKm(origin, { lat: j.latitude, lng: j.longitude }) : null,
    }));

  if (origin) {
    // Radius search; remote jobs always match.
    list = list.filter((j) => j.remote || (j.distance !== null && j.distance <= f.radius)).sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  } else if (f.where) {
    // No coordinates available: fall back to matching the place name.
    list = list.filter((j) => j.remote || matchesText(`${j.location ?? ""} ${j.postalCode ?? ""}`, f.where));
  }
  const start = (f.page - 1) * PAGE_SIZE;
  return { jobs: list.slice(start, start + PAGE_SIZE), total: list.length, origin: origin?.label ?? null, radiusApplied: Boolean(origin) };
}
