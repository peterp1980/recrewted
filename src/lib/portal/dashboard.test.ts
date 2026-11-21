import { describe, expect, it } from "vitest";
import { foldSources, normalize, pct, sourceLabel, totals } from "./dashboard";

describe("employer dashboard", () => {
  const rows = [
    normalize({ vacancy_id: "a", applications: "10", qualified: "6", shortlisted: "3", interviews: "2", hired: "1", first_shortlist_days: "4.5", sources: { meta: 6, career_page: 4 } }),
    normalize({ vacancy_id: "b", applications: "4", qualified: "2", shortlisted: "0", interviews: "0", hired: "0", first_shortlist_days: null, sources: { meta: "3", jobboard: "1" } }),
  ];
  it("sums funnel and averages only known shortlist times", () => {
    const t = totals(rows);
    expect(t).toMatchObject({ applications: 14, qualified: 8, shortlisted: 3, interviews: 2, hired: 1, avgShortlistDays: 4.5 });
    expect(t.sources).toEqual([{ key: "meta", count: 9 }, { key: "career_page", count: 4 }, { key: "jobboard", count: 1 }]);
  });
  it("folds small sources and labels them", () => {
    expect(foldSources({ a: 5, b: 4, c: 3, d: 2, e: 1, f: 1 }, 5)).toEqual([{ key: "a", count: 5 }, { key: "b", count: 4 }, { key: "c", count: 3 }, { key: "d", count: 2 }, { key: "weitere", count: 2 }]);
    expect(sourceLabel("career_page")).toBe("Karriereseite");
    expect(sourceLabel("xing")).toBe("xing");
    expect([pct(1, 3), pct(1, 0)]).toEqual([33, 0]);
  });
});
