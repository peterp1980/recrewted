import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { looksMobile, toE164 } from "./phone";
import { sendTemplate, type WaFetch } from "./send";
import { waTemplate } from "./templates";
import { isOptOut, parseWebhook, validSignature } from "./webhook";

describe("phone numbers", () => {
  it("normalizes German and international formats", () => {
    expect(toE164("0151 123 456 78")).toBe("+4915112345678");
    expect(toE164("+49 (0) 151-1234 5678")).toBe("+4915112345678");
    expect(toE164("0043 664 1234567")).toBe("+436641234567");
    expect(toE164("151123")).toBeNull();
    expect(toE164("+49 12")).toBeNull();
    expect([looksMobile("+4915112345678"), looksMobile("+498912345678"), looksMobile("+436641234567")]).toEqual([true, false, true]);
  });
});

describe("templates", () => {
  it("maps messages to approved templates with plain parameters", () => {
    expect(waTemplate("interview_booked", { firstName: "Kai", jobTitle: "Busfahrer", startsAt: "2026-12-01T09:00:00Z", mode: "onsite", location: "Landsberger Str. 72", tone: "du" }))
      .toEqual({ name: "recrewted_interview_booked_du", params: ["Kai", "Busfahrer", "Dienstag, 1. Dezember, 10:00 Uhr", "vor Ort, Landsberger Str. 72"] });
    expect(waTemplate("status_update", { firstName: "Kai", jobTitle: "Job\nZeile", status: "shortlisted" })?.params).toEqual(["Kai", "Job Zeile", "liegt jetzt beim Unternehmen"]);
    expect(waTemplate("status_update", { status: "screening" })).toBeNull();
    expect(waTemplate("booking_invite", { firstName: "Kai" })).toBeNull();
    expect(waTemplate("profile_link", {})).toBeNull();
  });
});

describe("sending", () => {
  it("posts a template message and returns the id", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const f = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200 });
    }) as unknown as WaFetch;
    const r = await sendTemplate({ token: "t", phoneId: "123", version: "v21.0" }, "+4915112345678", { name: "recrewted_status_update", params: ["Kai"] }, f);
    expect(r).toEqual({ ok: true, id: "wamid.1" });
    expect(calls[0].url).toBe("https://graph.facebook.com/v21.0/123/messages");
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({ to: "4915112345678", type: "template", template: { name: "recrewted_status_update", language: { code: "de" } } });
    const bad = (async () => new Response(JSON.stringify({ error: { message: "Template not approved" } }), { status: 400 })) as unknown as WaFetch;
    expect(await sendTemplate({ token: "t", phoneId: "1", version: "v21.0" }, "+491511", { name: "x", params: [] }, bad)).toEqual({ ok: false, error: "HTTP 400: Template not approved", retry: false });
  });
});

describe("webhook", () => {
  it("checks the signature and reads states and replies", () => {
    const body = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [{ id: "wamid.1", status: "read" }, { id: "x", status: "weird" }], messages: [{ id: "m1", from: "4915112345678", text: { body: "STOP" } }] } }] }] });
    const sig = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;
    expect(validSignature(body, sig, "secret")).toBe(true);
    expect(validSignature(body, sig, "other")).toBe(false);
    expect(validSignature(body, null, "secret")).toBe(false);
    const p = parseWebhook(JSON.parse(body));
    expect(p.statuses).toEqual([{ id: "wamid.1", status: "read" }]);
    expect(p.messages).toEqual([{ id: "m1", from: "+4915112345678", text: "STOP" }]);
    expect([isOptOut("Stopp!"), isOptOut("abmelden"), isOptOut("Stop bitte nicht"), isOptOut(null)]).toEqual([true, true, false, false]);
  });
});
