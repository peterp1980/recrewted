import { describe, expect, it } from "vitest";
import { overallKpis, vacancyKpis, type VacancyFacts } from "./kpis";

const base: VacancyFacts = { id: "a", title: "A", status: "active", start: "2026-11-01T00:00:00Z", firstShortlist: "2026-11-08T12:00:00Z", qualified: 5, hired: 0, mediaSpend: 1000, customerCost: 4900, portalMinutes: 30 };

describe("KPIs", () => {
  it("computes per vacancy", () => {
    expect(vacancyKpis(base)).toEqual({ daysToShortlist: 7.5, costPerQualified: 980, mediaPerQualified: 200, portalMinutes: 30 });
    expect(vacancyKpis({ ...base, firstShortlist: null, qualified: 0 })).toMatchObject({ daysToShortlist: null, costPerQualified: null });
  });

  it("computes the fill rate over closed vacancies only", () => {
    const k = overallKpis([
      { ...base, status: "filled", hired: 1 },
      { ...base, id: "b", status: "closed", hired: 0 },
      { ...base, id: "c", status: "active" },
    ]);
    expect(k.fillRate).toBe(50);
    expect(k.avgDaysToShortlist).toBe(7.5);
    expect(k.avgPortalMinutes).toBe(30);
  });
});
