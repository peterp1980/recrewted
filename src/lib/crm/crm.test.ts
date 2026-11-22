import { describe, expect, it, vi } from "vitest";
import { marksWon, statusNote } from "./notes";
import { CrmError, crmConfig, dealUrl, Pipedrive } from "./pipedrive";

const facts = { title: "Fahrer <m/w/d>", openings: 2, applications: 40, qualified: 12, shortlisted: 5, hired: 2, url: "https://recrewted.de/admin/vacancies/x" };

describe("deal notes", () => {
  it("marks the deal won on first activation only", () => {
    expect(marksWon("contract_pending", "active")).toBe(true);
    expect(marksWon("draft", "active")).toBe(true);
    expect(marksWon("paused", "active")).toBe(false);
  });
  it("writes counts, never names, and escapes the title", () => {
    const n = statusNote("active", "filled", facts);
    expect(n).toContain("Stelle besetzt: 2 von 2 eingestellt.");
    expect(n).toContain("Bewerbungen: 40 · qualifiziert: 12 · Shortlist: 5 · eingestellt: 2");
    expect(n).toContain("Fahrer &lt;m/w/d&gt;");
    expect(statusNote("contract_pending", "active", facts)).toContain("Vertrag unterschrieben");
  });
});

describe("pipedrive client", () => {
  it("reads config and builds deal links", () => {
    expect(crmConfig({})).toBeNull();
    expect(crmConfig({ PIPEDRIVE_API_TOKEN: "t", PIPEDRIVE_PIPELINE_ID: "12", PIPEDRIVE_STAGE_ID: "81", PIPEDRIVE_COMPANY_DOMAIN: "projx" })).toEqual({ token: "t", pipelineId: 12, stageId: 81, domain: "projx" });
    expect(dealUrl(5, "projx")).toBe("https://projx.pipedrive.com/deal/5");
    expect(dealUrl(5, null)).toBe("https://app.pipedrive.com/deal/5");
  });

  it("creates deals in the configured pipeline with the token in a header", async () => {
    const f = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ success: true, data: { id: 99 } }), { status: 201 }));
    const pd = new Pipedrive({ token: "secret", pipelineId: 12, stageId: 81, domain: null }, f as unknown as typeof fetch);
    expect(await pd.createDeal({ title: "A – Fahrer", orgId: 7, value: 4900 })).toBe(99);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.pipedrive.com/v1/deals");
    expect(url).not.toContain("secret");
    expect((init!.headers as Record<string, string>)["x-api-token"]).toBe("secret");
    expect(JSON.parse(String(init!.body))).toEqual({ title: "A – Fahrer", org_id: 7, pipeline_id: 12, stage_id: 81, value: 4900, currency: "EUR" });
  });

  it("retries rate limits and server errors, not bad tokens", async () => {
    const make = (status: number) => new Pipedrive({ token: "t", pipelineId: null, stageId: null, domain: null }, (async () => new Response("{}", { status })) as unknown as typeof fetch);
    await expect(make(429).getDeal(1)).rejects.toMatchObject({ retry: true });
    await expect(make(401).getDeal(1)).rejects.toMatchObject({ retry: false, message: "Pipedrive: API-Token ungültig" });
    await expect(make(401).getDeal(1)).rejects.toBeInstanceOf(CrmError);
  });
});
