// KPIs from CLAUDE.md / docs/tracking.md, computed per vacancy and overall.

export type VacancyFacts = {
  id: string;
  title: string;
  status: string;
  start: string | null; // first campaign start, else publication
  firstShortlist: string | null;
  qualified: number;
  hired: number;
  mediaSpend: number;
  customerCost: number | null;
  portalMinutes: number;
};

export const daysBetween = (a: string, b: string) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000 * 10) / 10);

export function vacancyKpis(v: VacancyFacts) {
  return {
    daysToShortlist: v.start && v.firstShortlist ? daysBetween(v.start, v.firstShortlist) : null,
    costPerQualified: v.customerCost !== null && v.qualified ? Math.round((v.customerCost / v.qualified) * 100) / 100 : null,
    mediaPerQualified: v.qualified ? Math.round((v.mediaSpend / v.qualified) * 100) / 100 : null,
    portalMinutes: v.portalMinutes,
  };
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null);

export function overallKpis(vs: VacancyFacts[]) {
  const per = vs.map(vacancyKpis);
  const closed = vs.filter((v) => v.status === "filled" || v.status === "closed");
  return {
    avgDaysToShortlist: avg(per.map((p) => p.daysToShortlist).filter((x): x is number => x !== null)),
    avgCostPerQualified: avg(per.map((p) => p.costPerQualified).filter((x): x is number => x !== null)),
    fillRate: closed.length ? Math.round((closed.filter((v) => v.hired > 0).length / closed.length) * 1000) / 10 : null,
    avgPortalMinutes: avg(vs.map((v) => v.portalMinutes)),
  };
}
