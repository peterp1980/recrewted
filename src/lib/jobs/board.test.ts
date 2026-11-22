import { describe, expect, it } from "vitest";
import { initials, isNew, postedLabel } from "./format";
import { jobsHref, parseJobFilters } from "./filters";

describe("posting age", () => {
  const now = new Date("2026-11-22T09:00:00Z");
  it("speaks in days and weeks, by Berlin calendar day", () => {
    expect(postedLabel("2026-11-22T06:00:00Z", now)).toBe("heute");
    expect(postedLabel("2026-11-21T23:30:00Z", now)).toBe("heute"); // 00:30 in Berlin
    expect(postedLabel("2026-11-21T22:30:00Z", now)).toBe("gestern");
    expect(postedLabel("2026-11-20T12:00:00Z", now)).toBe("vor 2 Tagen");
    expect(postedLabel("2026-11-08T12:00:00Z", now)).toBe("vor 2 Wochen");
    expect(postedLabel("2026-09-01T12:00:00Z", now)).toBe("am 1. September 2026");
  });
  it("marks postings younger than a week as new", () => {
    expect(isNew("2026-11-17T09:00:00Z", now.getTime())).toBe(true);
    expect(isNew("2026-11-14T09:00:00Z", now.getTime())).toBe(false);
  });
});

describe("initials", () => {
  it("skips legal forms", () => {
    expect(initials("Hafermann Reisen GmbH")).toBe("HR");
    expect(initials("projx GmbH")).toBe("PR");
  });
});

describe("quick filters", () => {
  it("reads and writes remote and salary filters", () => {
    const f = parseJobFilters({ q: "Fahrer", remote: "1", gehalt: "1", seite: "3" });
    expect(f).toMatchObject({ remote: true, salary: true, page: 3 });
    expect(jobsHref(f)).toBe("/jobs?q=Fahrer&remote=1&gehalt=1");
    expect(jobsHref(f, { remote: false, type: "part_time" })).toBe("/jobs?q=Fahrer&art=part_time&gehalt=1");
    expect(jobsHref(f, { page: 2 })).toBe("/jobs?q=Fahrer&remote=1&gehalt=1&seite=2");
  });
});
