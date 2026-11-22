import { describe, expect, it } from "vitest";
import { parseImprint, usesCustomerImprint } from "./imprint";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("customer imprint", () => {
  it("parses text and link", () => {
    expect(parseImprint(form({ imprint: "  A GmbH, Musterstraße 1, 80331 München  ", imprintUrl: "a-gmbh.de/impressum" }))).toEqual({
      ok: true, value: { imprint: "A GmbH, Musterstraße 1, 80331 München", imprintUrl: "https://a-gmbh.de/impressum" },
    });
    expect(parseImprint(form({}))).toEqual({ ok: true, value: { imprint: null, imprintUrl: null } });
    expect(parseImprint(form({ imprint: "zu kurz" }))).toEqual({ ok: false, error: "imprint" });
    expect(parseImprint(form({ imprintUrl: "http://a.de/impressum" }))).toEqual({ ok: false, error: "imprint" });
  });

  it("applies only on the verified own domain", () => {
    const o = { career_domain: "karriere.a.de", career_domain_verified_at: "2026-11-22T08:00:00Z", imprint: "x".repeat(40), imprint_url: null };
    expect(usesCustomerImprint(o, "karriere.a.de")).toBe(true);
    expect(usesCustomerImprint(o, "recrewted.de")).toBe(false);
    expect(usesCustomerImprint({ ...o, career_domain_verified_at: null }, "karriere.a.de")).toBe(false);
    expect(usesCustomerImprint({ ...o, imprint: null }, "karriere.a.de")).toBe(false);
  });
});
