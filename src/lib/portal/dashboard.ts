// Employer dashboard (0023): totals over the customer's vacancies and source shares.

export type DashboardRow = { vacancy_id: string; applications: number; qualified: number; shortlisted: number; interviews: number; hired: number; first_shortlist_days: number | null; sources: Record<string, number> };

const SOURCE_LABELS: Record<string, string> = {
  jobboard: "recrewted-Jobbörse", career_page: "Karriereseite", widget: "Widget auf Ihrer Website", portal_feed: "Jobportale (Feed)",
  meta: "Facebook/Instagram", google: "Google", indeed: "Indeed", linkedin: "LinkedIn", tiktok: "TikTok", ba: "BA-Jobbörse", stepstone: "StepStone", unbekannt: "Unbekannt", weitere: "Weitere",
};
export const sourceLabel = (k: string) => SOURCE_LABELS[k] ?? k;

/** RPC rows come with bigint/numeric as strings; normalize once. */
export function normalize(raw: { vacancy_id: string; applications: unknown; qualified: unknown; shortlisted: unknown; interviews: unknown; hired: unknown; first_shortlist_days: unknown; sources: unknown }): DashboardRow {
  const n = (v: unknown) => Number(v ?? 0) || 0;
  const src = raw.sources && typeof raw.sources === "object" && !Array.isArray(raw.sources) ? (raw.sources as Record<string, unknown>) : {};
  return {
    vacancy_id: raw.vacancy_id,
    applications: n(raw.applications), qualified: n(raw.qualified), shortlisted: n(raw.shortlisted), interviews: n(raw.interviews), hired: n(raw.hired),
    first_shortlist_days: raw.first_shortlist_days === null || raw.first_shortlist_days === undefined ? null : Math.max(0, Number(raw.first_shortlist_days)),
    sources: Object.fromEntries(Object.entries(src).map(([k, v]) => [k, n(v)])),
  };
}

export function totals(rows: DashboardRow[]) {
  const sum = (k: "applications" | "qualified" | "shortlisted" | "interviews" | "hired") => rows.reduce((s, r) => s + r[k], 0);
  const days = rows.map((r) => r.first_shortlist_days).filter((d): d is number => d !== null);
  const sources: Record<string, number> = {};
  for (const r of rows) for (const [k, v] of Object.entries(r.sources)) sources[k] = (sources[k] ?? 0) + v;
  return {
    applications: sum("applications"), qualified: sum("qualified"), shortlisted: sum("shortlisted"), interviews: sum("interviews"), hired: sum("hired"),
    avgShortlistDays: days.length ? Math.round((days.reduce((s, d) => s + d, 0) / days.length) * 10) / 10 : null,
    // Largest first; more than five sources fold into "Weitere".
    sources: foldSources(sources),
  };
}

export function foldSources(src: Record<string, number>, max = 5): { key: string; count: number }[] {
  const list = Object.entries(src).filter(([, v]) => v > 0).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  if (list.length <= max) return list;
  const rest = list.slice(max - 1).reduce((s, x) => s + x.count, 0);
  return [...list.slice(0, max - 1), { key: "weitere", count: rest }];
}

export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
