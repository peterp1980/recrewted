import { describe, expect, it } from "vitest";
import { timeToShortlist, vacancyLine, worthSending, type ReportVacancy } from "./weekly";

const v = (o: Partial<ReportVacancy> = {}): ReportVacancy => ({
  title: "Busfahrer:in", status: "active", applications: 12, newThisWeek: 3, qualified: 5, shortlisted: 2, hired: 0,
  costPerQualified: 180, publishedAt: "2026-11-01T00:00:00Z", firstShortlistAt: "2026-11-09T12:00:00Z", ...o,
});

describe("weekly report", () => {
  it("writes one readable line per vacancy", () => {
    expect(vacancyLine(v()).replace(/\u00a0/g, " ")).toBe("12 Bewerbungen (+3 diese Woche) · 5 passend · 2 vorgestellt · erste Shortlist nach 8,5 Tagen · 180 € pro passendem Kandidaten");
    expect(vacancyLine(v({ newThisWeek: 0, hired: 1, firstShortlistAt: null, costPerQualified: null }))).toBe("12 Bewerbungen · 5 passend · 2 vorgestellt · 1 eingestellt");
  });
  it("measures the time to the first shortlist", () => {
    expect(timeToShortlist(v())).toBe(8.5);
    expect(timeToShortlist(v({ publishedAt: null }))).toBeNull();
  });
  it("is only sent when something runs or happened", () => {
    const r = { organization: "A", from: "", to: "", vacancies: [v({ status: "filled", newThisWeek: 0 })] };
    expect(worthSending(r)).toBe(false);
    expect(worthSending({ ...r, vacancies: [v()] })).toBe(true);
  });
});

describe("weekly report PDF", () => {
  it("renders, also with umlauts and many vacancies", async () => {
    const { weeklyReportPdf } = await import("./pdf");
    const pdf = await weeklyReportPdf({ organization: "Hafermann Reisen GmbH & Co. KG", from: "14.11.2026", to: "21.11.2026", vacancies: Array.from({ length: 30 }, (_, i) => v({ title: `Fahrer:in Ü${i} (m/w/d)` })) });
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
  });
});
