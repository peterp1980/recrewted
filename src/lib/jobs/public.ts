import "server-only";
import { fromStored } from "@/lib/briefing/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { distanceKm, type EmployerBrand, type PublicJob } from "./format";
import { matchesText, type JobFilters } from "./filters";
import { sanitizeDocument, type CareerDocument, type SectionData } from "@/lib/careers/document";

// The job board is public, but vacancies are not: this module reads active
// vacancies with the service role and returns only public fields. Pricing,
// CRM IDs and internal status never leave the server.

const COLUMNS =
  "id, organization_id, title, location, postal_code, latitude, longitude, remote, employment_type, category, salary_min, salary_max, salary_period, published_at, employer_visible, organizations(name, website, candidate_tone, slug, career_enabled, brand_color, career_pages(published)), vacancy_briefings(data), job_ads(channel, status, body, version)";

type Row = {
  id: string; organization_id: string; title: string; location: string | null; postal_code: string | null; latitude: number | null; longitude: number | null;
  remote: boolean; employment_type: string | null; category: string | null; salary_min: number | null; salary_max: number | null;
  salary_period: string; published_at: string | null; employer_visible: boolean;
  organizations: {
    name: string; website: string | null; candidate_tone: string; slug: string | null; career_enabled: boolean; brand_color: string | null;
    career_pages: { published: unknown } | null;
  } | null; vacancy_briefings: { data: unknown } | null;
  job_ads: { channel: string; status: string; body: string; version: number }[] | null;
};

/** Logo, colour and a short "about" text from the published career page. Never for confidential searches. */
function employerBrand(r: Row): EmployerBrand | null {
  const o = r.organizations;
  if (!r.employer_visible || !o) return null;
  const published = o.career_enabled ? o.career_pages?.published : null;
  const doc = published ? sanitizeDocument(published) : null;
  const visible = doc?.sections.filter((s) => s.visible) ?? [];
  const hero = visible.find((s) => s.type === "hero")?.data as SectionData["hero"] | undefined;
  const text = visible.find((s) => s.type === "text")?.data as SectionData["text"] | undefined;
  const about = (text?.body || hero?.text || "").trim();
  return {
    logo: doc?.logoUrl ?? null,
    slug: doc && o.slug ? o.slug : null,
    color: o.brand_color && /^#[0-9a-f]{6}$/i.test(o.brand_color) ? o.brand_color : null,
    about: about ? (about.length > 420 ? `${about.slice(0, 417).replace(/\s+\S*$/, "")} …` : about) : null,
    image: hero?.imageUrl ?? text?.imageUrl ?? null,
  };
}

function toPublic(r: Row): PublicJob {
  const briefing = fromStored(r.vacancy_briefings?.data);
  return {
    id: r.id,
    organizationId: r.organization_id,
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
    employer: employerBrand(r),
    briefing,
    tone: r.organizations?.candidate_tone === "du" ? "du" : "sie",
    adText: (r.job_ads ?? []).filter((a) => a.channel === "portal" && a.status === "approved").sort((a, b) => b.version - a.version)[0]?.body ?? null,
  };
}

/** Active vacancies. A salary is optional (decision 21.11.2026). */
async function activeRows(): Promise<Row[]> {
  const { data, error } = await createAdminClient()
    .from("vacancies")
    .select(COLUMNS)
    .eq("status", "active")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`job board query failed: ${error.message}`);
  return (data ?? []) as unknown as Row[];
}

export async function getPublicJob(id: string): Promise<PublicJob | null> {
  const { data } = await createAdminClient().from("vacancies").select(COLUMNS).eq("id", id).eq("status", "active").maybeSingle();
  if (!data) return null;
  return toPublic(data as unknown as Row);
}

export async function allPublicJobs(): Promise<PublicJob[]> {
  return (await activeRows()).map(toPublic);
}

/** Up to three other active jobs: same field first, then nearby, then the newest. */
export async function similarJobs(job: PublicJob, limit = 3): Promise<PublicJob[]> {
  const others = (await allPublicJobs()).filter((j) => j.id !== job.id);
  const here = job.latitude !== null && job.longitude !== null ? { lat: job.latitude, lng: job.longitude } : null;
  const score = (j: PublicJob) =>
    (job.category && j.category === job.category ? 0 : 1000) +
    (here && j.latitude !== null && j.longitude !== null ? Math.min(distanceKm(here, { lat: j.latitude, lng: j.longitude }), 999) : 999);
  return others.map((j) => [score(j), j] as const).sort((a, b) => a[0] - b[0]).slice(0, limit).map(([, j]) => j);
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
    .filter((j) => !f.remote || j.remote)
    .filter((j) => !f.salary || j.salaryMin !== null || j.salaryMax !== null)
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

export type CareerPage = {
  organizationId: string;
  name: string;
  slug: string;
  website: string | null;
  brandColor: string | null;
  tone: "sie" | "du";
  /** Own domain (0017); the page's main address when set. */
  domain: string | null;
  doc: CareerDocument;
  jobs: PublicJob[];
};

/** Active, non-confidential vacancies of one customer. Confidential searches never name the employer. */
export async function jobsOfOrganization(organizationId: string): Promise<PublicJob[]> {
  const { data, error } = await createAdminClient()
    .from("vacancies")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .eq("employer_visible", true)
    .order("published_at", { ascending: false });
  if (error) throw new Error(`career jobs query failed: ${error.message}`);
  return ((data ?? []) as unknown as Row[]).map(toPublic);
}

/** Public career page: the published document only, never the draft. */
export async function getCareerPage(slug: string): Promise<CareerPage | null> {
  const { data: org } = await createAdminClient()
    .from("organizations")
    .select("id, name, slug, website, brand_color, candidate_tone, career_domain, career_pages(published)")
    .eq("slug", slug)
    .eq("career_enabled", true)
    .maybeSingle();
  const published = (org?.career_pages as unknown as { published: unknown } | null)?.published;
  if (!org || !org.slug || !published) return null;
  return {
    organizationId: org.id,
    name: org.name,
    slug: org.slug,
    website: org.website,
    brandColor: org.brand_color,
    tone: org.candidate_tone === "du" ? "du" : "sie",
    domain: org.career_domain,
    doc: sanitizeDocument(published),
    jobs: await jobsOfOrganization(org.id),
  };
}

/** Slugs of published career pages, for the sitemap. */
export async function careerSlugs(): Promise<string[]> {
  const { data } = await createAdminClient().from("organizations").select("slug").eq("career_enabled", true).not("slug", "is", null);
  return (data ?? []).flatMap((o) => (o.slug ? [o.slug] : []));
}
