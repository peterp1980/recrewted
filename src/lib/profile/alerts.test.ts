import { describe, expect, it } from "vitest";
import { emptyBriefing } from "@/lib/briefing/schema";
import type { PublicJob } from "@/lib/jobs/format";
import { comparePoolFit, matchJobs, parsePrefs, poolFit, prefsFromForm, prefsFromJob } from "./alerts";

const job = (o: Partial<PublicJob>): PublicJob => ({
  id: "x", title: "Job", location: "Witten", postalCode: "58452", latitude: 51.44, longitude: 7.33, remote: false,
  employmentType: "full_time", category: "logistics", salaryMin: null, salaryMax: null, salaryPeriod: "year",
  publishedAt: "2026-11-21T10:00:00Z", employerName: "A", employerWebsite: null, employer: null, briefing: emptyBriefing(), adText: null, tone: "sie", ...o,
});
const since = new Date("2026-11-20T00:00:00Z");

describe("alert preferences", () => {
  it("reads stored and form values defensively", () => {
    expect(parsePrefs({ categories: ["logistics", "nope"], types: "full_time", postalCode: "1234", radiusKm: 7 })).toEqual({ categories: ["logistics"], types: [], postalCode: null, radiusKm: null });
    const f = new FormData();
    f.append("categories", "office"); f.append("categories", "office"); f.append("types", "part_time");
    f.set("postalCode", "58452"); f.set("radiusKm", "25");
    expect(prefsFromForm(f)).toEqual({ categories: ["office"], types: ["part_time"], postalCode: "58452", radiusKm: 25 });
    expect(prefsFromJob(job({}))).toEqual({ categories: ["logistics"], types: ["full_time"], postalCode: "58452", radiusKm: 50 });
  });
});

describe("matching", () => {
  const prefs = parsePrefs({ categories: ["logistics"], types: [], postalCode: "58452", radiusKm: 25 });
  it("keeps new, fitting jobs nearby that were not applied for", () => {
    const jobs = [
      job({ id: "ok" }),
      job({ id: "old", publishedAt: "2026-11-01T00:00:00Z" }),
      job({ id: "applied" }),
      job({ id: "office", category: "office" }),
      job({ id: "far", latitude: 48.14, longitude: 11.58 }),
      job({ id: "remote", remote: true, latitude: 48.14, longitude: 11.58 }),
    ];
    const out = matchJobs(prefs, jobs, { since, applied: new Set(["applied"]), origin: { lat: 51.44, lng: 7.33 } });
    expect(out.map((j) => j.id)).toEqual(["ok", "remote"]);
  });
  it("treats empty preferences as 'any' and caps the list", () => {
    const jobs = Array.from({ length: 9 }, (_, i) => job({ id: String(i), category: "office" }));
    expect(matchJobs(parsePrefs({}), jobs, { since, applied: new Set(), origin: null })).toHaveLength(5);
  });
});

describe("talent pool fit", () => {
  const v = { category: "logistics", employmentType: "full_time", latitude: 51.44, longitude: 7.33, remote: false };
  it("applies category, type and radius like the alert", () => {
    expect(poolFit(parsePrefs({ categories: ["logistics"], postalCode: "58452", radiusKm: 25 }), v, { lat: 51.44, lng: 7.33 })).toEqual({ fits: true, distanceKm: 0, categoryMatch: true });
    expect(poolFit(parsePrefs({ categories: ["office"] }), v, null).fits).toBe(false);
    expect(poolFit(parsePrefs({ types: ["part_time"] }), v, null).fits).toBe(false);
    expect(poolFit(parsePrefs({ postalCode: "80339", radiusKm: 25 }), v, { lat: 48.14, lng: 11.55 }).fits).toBe(false);
    expect(poolFit(parsePrefs({ postalCode: "80339", radiusKm: 25 }), { ...v, remote: true }, { lat: 48.14, lng: 11.55 }).fits).toBe(true);
    expect(poolFit(parsePrefs({}), v, null)).toEqual({ fits: true, distanceKm: null, categoryMatch: false });
  });
  it("ranks explicit category matches first, then by distance", () => {
    const list = [
      { id: "any", f: { fits: true, distanceKm: 1, categoryMatch: false } },
      { id: "far", f: { fits: true, distanceKm: 40, categoryMatch: true } },
      { id: "near", f: { fits: true, distanceKm: 5, categoryMatch: true } },
      { id: "unknown", f: { fits: true, distanceKm: null, categoryMatch: true } },
    ];
    expect(list.sort((a, b) => comparePoolFit(a.f, b.f)).map((x) => x.id)).toEqual(["near", "far", "unknown", "any"]);
  });
});
