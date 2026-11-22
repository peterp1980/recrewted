import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { contractStatus, PandaDoc, PandaDocError, splitName, webhookSignatureOk } from "./pandadoc";
import { buildTokens, documentNumber } from "./tokens";

describe("tokens", () => {
  const base = {
    company: "Hafermann Reisen GmbH", website: "https://hafermann-reisen.de", recipientName: "Anna Muster", recipientEmail: "anna@hafermann.de",
    vacancy: { title: "Reisebusfahrer:in (m/w/d)", location: "Witten", remote: false, openings: 2, startDate: null },
    packageLabel: "Festpreis Pro", price: 4900, mediaMarkupPct: null, pricingModel: "fixed_pro", countersigner: null,
    contractId: "1a2b3c4d-0000-0000-0000-000000000000", now: new Date("2026-11-22T10:00:00Z"),
  };
  it("fills offer placeholders", () => {
    const t = buildTokens(base);
    expect(t).toMatchObject({ "Kunde.Firma": "Hafermann Reisen GmbH", "Stelle.Titel": "Reisebusfahrer:in (m/w/d)", "Stelle.Anzahl": "2", "Stelle.Start": "ab sofort", Werbebudget: "im Preis enthalten", "Dokument.Nummer": "RC-2026-1A2B3C", "Dokument.Datum": "22. November 2026" });
    expect(t.Preis.replace(/\s/g, " ")).toBe("4.900,00 €");
  });
  it("leaves vacancy fields empty for a framework contract and explains media billing", () => {
    const t = buildTokens({ ...base, vacancy: null, price: null, pricingModel: "service_fee_media_passthrough", mediaMarkupPct: 15 });
    expect(t["Stelle.Titel"]).toBe("");
    expect(t.Preis).toBe("");
    expect(t.Werbebudget).toBe("wird separat abgerechnet, zzgl. 15 % Aufschlag");
  });
  it("numbers documents", () => expect(documentNumber("abcdef12-3456", new Date("2027-01-02"))).toBe("RC-2027-ABCDEF"));
});

describe("pandadoc", () => {
  it("maps statuses", () => {
    expect(contractStatus("document.completed")).toBe("completed");
    expect(contractStatus("document.viewed")).toBe("viewed");
    expect(contractStatus("document.voided")).toBe("expired");
    expect(contractStatus("document.something")).toBeNull();
  });
  it("splits names", () => {
    expect(splitName("Anna Maria Muster")).toEqual({ first_name: "Anna Maria", last_name: "Muster" });
    expect(splitName("Anna")).toEqual({ first_name: "Anna", last_name: "" });
  });
  it("checks webhook signatures", () => {
    const body = '[{"event":"document_state_changed"}]';
    const sig = createHmac("sha256", "k").update(body).digest("hex");
    expect(webhookSignatureOk(body, sig, "k")).toBe(true);
    expect(webhookSignatureOk(body + " ", sig, "k")).toBe(false);
    expect(webhookSignatureOk(body, sig, "other")).toBe(false);
    expect(webhookSignatureOk(body, null, "k")).toBe(false);
  });
  it("creates documents from a template with the key in the header", async () => {
    const f = vi.fn(async (_u: string, _i?: RequestInit) => new Response(JSON.stringify({ id: "doc123", status: "document.uploaded" }), { status: 201 }));
    const pd = new PandaDoc("secret", f as unknown as typeof fetch);
    const r = await pd.createFromTemplate({ name: "Angebot", templateId: "tpl", recipients: [{ email: "a@b.de", first_name: "A", last_name: "B", role: "Kunde" }], tokens: { Preis: "1 €" }, metadata: { contractId: "c" } });
    expect(r).toEqual({ id: "doc123", status: "document.uploaded" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.pandadoc.com/public/v1/documents");
    expect((init!.headers as Record<string, string>).Authorization).toBe("API-Key secret");
    expect(JSON.parse(String(init!.body)).tokens).toEqual([{ name: "Preis", value: "1 €" }]);
  });
  it("retries server errors, not bad keys", async () => {
    const pd = (s: number) => new PandaDoc("k", (async () => new Response("{}", { status: s })) as unknown as typeof fetch);
    await expect(pd(503).status("x")).rejects.toMatchObject({ retry: true });
    await expect(pd(401).status("x")).rejects.toMatchObject({ retry: false, message: "PandaDoc: API-Key ungültig" });
    await expect(pd(401).status("x")).rejects.toBeInstanceOf(PandaDocError);
  });
});
