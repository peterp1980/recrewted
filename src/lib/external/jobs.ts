import { htmlToLines } from "@/lib/imports/normalize";

// Partner jobs (Adzuna, Jooble): shown on our job board as external listings with attribution.
// Server-side request with search words and place only – no visitor data is sent. Cached for an hour.
//   ADZUNA_APP_ID, ADZUNA_APP_KEY (free developer account), JOOBLE_API_KEY (free partner key)

export type ExternalJob = { id: string; source: "adzuna" | "jooble"; title: string; company: string | null; location: string | null; salary: string | null; snippet: string; url: string };

export function externalConfigured(env: Record<string, string | undefined> = process.env) {
  return { adzuna: Boolean(env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY), jooble: Boolean(env.JOOBLE_API_KEY) };
}

const text = (html: unknown) => (typeof html === "string" ? htmlToLines(html).join(" ").replace(/^- /, "") : "");
const httpsOnly = (u: unknown) => (typeof u === "string" && /^https:\/\//.test(u) ? u : null);
const eur = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

type Any = Record<string, unknown>;
const o = (v: unknown): Any => (v && typeof v === "object" && !Array.isArray(v) ? (v as Any) : {});

export function parseAdzuna(data: unknown): ExternalJob[] {
  const results = o(data).results;
  return (Array.isArray(results) ? results : []).flatMap((raw) => {
    const r = o(raw);
    const url = httpsOnly(r.redirect_url);
    if (!url) return [];
    const min = typeof r.salary_min === "number" ? r.salary_min : null;
    const max = typeof r.salary_max === "number" ? r.salary_max : null;
    // Adzuna marks estimated salaries; only show stated ones.
    const salary = r.salary_is_predicted === "1" || !min ? null : `${eur.format(min)}${max && max !== min ? ` – ${eur.format(max)}` : ""} €`;
    return [{ id: `adzuna-${String(r.id)}`, source: "adzuna" as const, title: text(r.title), company: text(o(r.company).display_name) || null, location: text(o(r.location).display_name) || null, salary, snippet: text(r.description).slice(0, 220), url }];
  });
}

export function parseJooble(data: unknown): ExternalJob[] {
  const jobs = o(data).jobs;
  return (Array.isArray(jobs) ? jobs : []).flatMap((raw) => {
    const j = o(raw);
    const url = httpsOnly(j.link);
    if (!url) return [];
    return [{ id: `jooble-${String(j.id)}`, source: "jooble" as const, title: text(j.title), company: text(j.company) || null, location: text(j.location) || null, salary: text(j.salary) || null, snippet: text(j.snippet).slice(0, 220), url }];
  });
}

/** Same job from both partners: keep the first. */
export function dedupe(jobs: ExternalJob[]): ExternalJob[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    const k = `${j.title}|${j.company ?? ""}|${j.location ?? ""}`.toLocaleLowerCase("de");
    if (!j.title || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function externalJobs(q: string, where: string, radius: number, f: typeof fetch = fetch, env: Record<string, string | undefined> = process.env): Promise<ExternalJob[]> {
  const c = externalConfigured(env);
  const calls: Promise<ExternalJob[]>[] = [];
  if (c.adzuna) {
    const u = new URL("https://api.adzuna.com/v1/api/jobs/de/search/1");
    u.searchParams.set("app_id", env.ADZUNA_APP_ID!);
    u.searchParams.set("app_key", env.ADZUNA_APP_KEY!);
    u.searchParams.set("results_per_page", "6");
    if (q) u.searchParams.set("what", q);
    if (where) {
      u.searchParams.set("where", where);
      u.searchParams.set("distance", String(radius));
    }
    calls.push(
      f(u.toString(), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } } as RequestInit)
        .then((r) => (r.ok ? r.json() : null))
        .then(parseAdzuna)
        .catch(() => []),
    );
  }
  if (c.jooble) {
    calls.push(
      f(`https://jooble.org/api/${encodeURIComponent(env.JOOBLE_API_KEY!)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: q, location: where, radius: String(radius), page: "1", ResultOnPage: "6" }),
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 3600 },
      } as RequestInit)
        .then((r) => (r.ok ? r.json() : null))
        .then(parseJooble)
        .catch(() => []),
    );
  }
  return dedupe((await Promise.all(calls)).flat()).slice(0, 10);
}
