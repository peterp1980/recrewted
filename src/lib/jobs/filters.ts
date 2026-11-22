import { CATEGORIES, EMPLOYMENT_TYPES, type Category, type EmploymentType } from "@/lib/briefing/schema";

export const RADII = [10, 25, 50, 100] as const;
export type JobFilters = { q: string; where: string; radius: number; category: Category | null; type: EmploymentType | null; remote: boolean; salary: boolean; page: number };

const pick = <T extends string>(v: unknown, list: readonly T[]): T | null => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Reads the job search from the query string; anything unknown is ignored. */
export function parseJobFilters(sp: Record<string, string | string[] | undefined>): JobFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]);
  const radius = Number(one("umkreis"));
  const page = Number(one("seite"));
  return {
    q: str(one("q"), 80),
    where: str(one("ort"), 60),
    radius: (RADII as readonly number[]).includes(radius) ? radius : 25,
    category: pick(one("berufsfeld"), CATEGORIES),
    type: pick(one("art"), EMPLOYMENT_TYPES),
    remote: one("remote") === "1",
    salary: one("gehalt") === "1",
    page: Number.isInteger(page) && page > 1 && page < 1000 ? page : 1,
  };
}

/** Case-insensitive match of all search words against title, location and briefing text. */
export function matchesText(haystack: string, q: string): boolean {
  if (!q) return true;
  const h = haystack.toLocaleLowerCase("de");
  return q.toLocaleLowerCase("de").split(/\s+/).filter(Boolean).every((w) => h.includes(w));
}

/** Link to the job board with the given filters; page 1 unless set. Used by pagination and quick filters. */
export function jobsHref(f: JobFilters, change: Partial<JobFilters> = {}): string {
  const n = { ...f, page: 1, ...change };
  const q = new URLSearchParams();
  if (n.q) q.set("q", n.q);
  if (n.where) q.set("ort", n.where);
  if (n.where) q.set("umkreis", String(n.radius));
  if (n.category) q.set("berufsfeld", n.category);
  if (n.type) q.set("art", n.type);
  if (n.remote) q.set("remote", "1");
  if (n.salary) q.set("gehalt", "1");
  if (n.page > 1) q.set("seite", String(n.page));
  const s = q.toString();
  return `/jobs${s ? `?${s}` : ""}`;
}
