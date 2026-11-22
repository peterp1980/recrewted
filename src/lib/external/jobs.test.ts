import { describe, expect, it, vi } from "vitest";
import { dedupe, externalConfigured, externalJobs, parseAdzuna, parseJooble } from "./jobs";

describe("partner jobs", () => {
  it("parses Adzuna, hides predicted salaries and non-https links", () => {
    const r = parseAdzuna({ results: [
      { id: 1, title: "<strong>Busfahrer</strong> (m/w/d)", company: { display_name: "Bus AG" }, location: { display_name: "Witten" }, redirect_url: "https://www.adzuna.de/land/ad/1", salary_min: 36000, salary_max: 42000, salary_is_predicted: "0", description: "Fahren …" },
      { id: 2, title: "Koch", redirect_url: "https://www.adzuna.de/land/ad/2", salary_min: 30000, salary_is_predicted: "1" },
      { id: 3, title: "Böse", redirect_url: "javascript:alert(1)" },
    ] });
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ title: "Busfahrer (m/w/d)", company: "Bus AG", salary: "36.000 – 42.000 €", source: "adzuna" });
    expect(r[1].salary).toBeNull();
  });
  it("parses Jooble", () => {
    expect(parseJooble({ jobs: [{ id: 9, title: "Pflegekraft", company: "Klinik", location: "Bochum", salary: "3.400 €", snippet: "<b>Pflege</b> im Team", link: "https://de.jooble.org/desc/9" }] })[0]).toMatchObject({ title: "Pflegekraft", snippet: "Pflege im Team", source: "jooble" });
  });
  it("drops duplicates across partners", () => {
    const j = { id: "a", source: "adzuna" as const, title: "Koch", company: "X", location: "Y", salary: null, snippet: "", url: "https://a" };
    expect(dedupe([j, { ...j, id: "b", source: "jooble" }])).toHaveLength(1);
  });
  it("asks nothing without keys and sends only search words and place", async () => {
    expect(externalConfigured({})).toEqual({ adzuna: false, jooble: false });
    const f = vi.fn(async (_u: string, _i?: RequestInit) => new Response(JSON.stringify({ jobs: [] }), { status: 200 }));
    expect(await externalJobs("Fahrer", "Witten", 25, f as unknown as typeof fetch, {})).toEqual([]);
    expect(f).not.toHaveBeenCalled();
    await externalJobs("Fahrer", "Witten", 25, f as unknown as typeof fetch, { JOOBLE_API_KEY: "k" });
    expect(JSON.parse(String(f.mock.calls[0][1]!.body))).toEqual({ keywords: "Fahrer", location: "Witten", radius: "25", page: "1", ResultOnPage: "6" });
  });
  it("survives a partner being down", async () => {
    const f = (async () => { throw new Error("down"); }) as unknown as typeof fetch;
    expect(await externalJobs("", "", 25, f, { ADZUNA_APP_ID: "a", ADZUNA_APP_KEY: "b", JOOBLE_API_KEY: "c" })).toEqual([]);
  });
});
