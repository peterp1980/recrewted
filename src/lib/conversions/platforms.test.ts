import { describe, expect, it } from "vitest";
import { buildRequest, platformFor, sha256Email, type ConversionInput } from "./platforms";

const c: ConversionInput = { eventId: "apply_submit:1", event: "apply_submit", occurredAt: "2026-11-21T10:00:00Z", clickIdType: "fbclid", clickId: "IwAR1", emailSha256: sha256Email(" Eva@Example.org ") };

describe("conversions", () => {
  it("maps click IDs to platforms", () => {
    expect([platformFor("fbclid"), platformFor("gbraid"), platformFor("ttclid"), platformFor("li_fat_id"), platformFor("x")]).toEqual(["meta", "google", "tiktok", "linkedin", null]);
  });
  it("hashes normalized e-mails", () => {
    expect(c.emailSha256).toBe(sha256Email("eva@example.org"));
    expect(c.emailSha256).toMatch(/^[0-9a-f]{64}$/);
  });
  it("does nothing without configuration", () => {
    for (const p of ["meta", "google", "tiktok", "linkedin"] as const) expect(buildRequest(p, c, {})).toBeNull();
  });
  it("sends only click ID, time, name, event ID and hashed e-mail to Meta", () => {
    const r = buildRequest("meta", c, { META_PIXEL_ID: "123", META_CAPI_TOKEN: "t" })!;
    const body = JSON.parse(String(r.init.body));
    expect(body.data[0]).toEqual({ event_name: "Lead", event_time: 1795255200, event_id: "apply_submit:1", action_source: "system_generated", user_data: { fbc: "fb.1.1795255200000.IwAR1", em: [c.emailSha256] } });
    expect(JSON.stringify(body)).not.toContain("example.org");
  });
  it("builds Google offline conversions with the right click ID field", () => {
    const r = buildRequest("google", { ...c, clickIdType: "gclid", clickId: "Cj0", event: "hired" }, { GOOGLE_ADS_CUSTOMER_ID: "1", GOOGLE_ADS_DEVELOPER_TOKEN: "d", GOOGLE_ADS_ACCESS_TOKEN: "a", GOOGLE_ADS_ACTION_HIRED: "customers/1/conversionActions/9" })!;
    expect(JSON.parse(String(r.init.body)).conversions[0]).toMatchObject({ gclid: "Cj0", conversionAction: "customers/1/conversionActions/9", conversionDateTime: "2026-11-21 10:00:00+00:00" });
  });
});
