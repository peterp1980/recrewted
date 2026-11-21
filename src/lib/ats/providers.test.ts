import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, secretHint } from "./crypto";
import { isPublicHttpsUrl, parseConfig, pushCandidate, testConnection, webhookSignature, type Candidate, type Fetch } from "./providers";

type Call = { url: string; init: RequestInit };
const fake = (responses: Response[]) => {
  const calls: Call[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return responses.shift() ?? new Response("{}", { status: 200 });
  }) as unknown as Fetch;
  return { f, calls };
};
const cand = (o: Partial<Candidate> = {}): Candidate => ({
  firstName: "Anna", lastName: "Muster", email: "anna@example.org", phone: "+49 89 1", jobId: "123", jobTitle: "Busfahrer (m/w/d)",
  note: "Über recrewted", cv: null, ...o,
});
const cv = { bytes: new Uint8Array([37, 80, 68, 70]), filename: "lebenslauf.pdf", contentType: "application/pdf", url: "https://files.example/cv" };

describe("secret storage", () => {
  it("round-trips, fails closed on tampering or a different master key", () => {
    const enc = encryptSecret("papi-123456", "master");
    expect(enc).toMatch(/^v1:/);
    expect(enc).not.toContain("papi");
    expect(decryptSecret(enc, "master")).toBe("papi-123456");
    expect(decryptSecret(enc, "other")).toBeNull();
    expect(decryptSecret(`${enc.slice(0, -2)}AA`, "master")).toBeNull();
    expect(secretHint("papi-123456")).toBe("…3456");
  });
});

describe("personio", () => {
  const ctx = (f: Fetch) => ({ config: { companyId: "42", channelId: "7" }, secret: "tok", fetch: f });
  it("uploads the CV first and references it in the application", async () => {
    const { f, calls } = fake([new Response(JSON.stringify({ uuid: "u-1" }), { status: 200 }), new Response("", { status: 201 })]);
    expect(await pushCandidate("personio", ctx(f), cand({ cv }))).toEqual({ ok: true, externalId: null });
    expect(calls[0].url).toBe("https://api.personio.de/v1/recruiting/applications/documents");
    expect(calls[1].url).toBe("https://api.personio.de/v1/recruiting/applications");
    const h = calls[1].init.headers as Record<string, string>;
    expect(h.Authorization).toBe("Bearer tok");
    expect(h["X-Company-ID"]).toBe("42");
    const body = JSON.parse(String(calls[1].init.body));
    expect(body).toMatchObject({ first_name: "Anna", job_position_id: 123, recruiting_channel_id: 7, files: [{ uuid: "u-1", category: "cv" }] });
  });
  it("does not retry client errors, retries rate limits", async () => {
    const a = fake([new Response("unknown job", { status: 404 })]);
    expect(await pushCandidate("personio", ctx(a.f), cand())).toMatchObject({ ok: false, retry: false });
    const b = fake([new Response("", { status: 429 })]);
    expect(await pushCandidate("personio", ctx(b.f), cand())).toMatchObject({ ok: false, retry: true });
    expect(await pushCandidate("personio", ctx(b.f), cand({ jobId: null }))).toMatchObject({ ok: false, retry: false });
  });
  it("reads job ids from the public feed for mapping", async () => {
    const xml = "<workzag-jobs><position><id>555</id><name><![CDATA[Busfahrer (m/w/d)]]></name></position></workzag-jobs>";
    const { f, calls } = fake([new Response(xml, { status: 200 })]);
    const r = await testConnection("personio", { config: { companyId: "42", subdomain: "hafermann" }, secret: "tok", fetch: f });
    expect(calls[0].url).toBe("https://hafermann.jobs.personio.de/xml");
    expect(r.jobs).toEqual([{ id: "555", title: "Busfahrer (m/w/d)" }]);
  });
});

describe("other adapters", () => {
  it("recruitee: candidate with offer, CV by short-lived link", async () => {
    const { f, calls } = fake([new Response(JSON.stringify({ candidate: { id: 9 } }), { status: 201 })]);
    expect(await pushCandidate("recruitee", { config: { companyId: "acme" }, secret: "t", fetch: f }, cand({ cv }))).toEqual({ ok: true, externalId: "9" });
    expect(calls[0].url).toBe("https://api.recruitee.com/c/acme/candidates");
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({ offers: [123], candidate: { emails: ["anna@example.org"], remote_cv_url: cv.url } });
  });
  it("smartrecruiters: job in the path, token header", async () => {
    const { f, calls } = fake([new Response(JSON.stringify({ id: "c-1" }), { status: 201 })]);
    expect(await pushCandidate("smartrecruiters", { config: {}, secret: "k", fetch: f }, cand({ jobId: "abc-1" }))).toEqual({ ok: true, externalId: "c-1" });
    expect(calls[0].url).toBe("https://api.smartrecruiters.com/jobs/abc-1/candidates");
    expect((calls[0].init.headers as Record<string, string>)["X-SmartToken"]).toBe("k");
  });
  it("lever and bamboohr: multipart with basic auth", async () => {
    const l = fake([new Response(JSON.stringify({ data: { id: "o-1" } }), { status: 201 })]);
    expect(await pushCandidate("lever", { config: { performAs: "user-0001" }, secret: "key", fetch: l.f }, cand({ jobId: "p-1", cv }))).toEqual({ ok: true, externalId: "o-1" });
    expect(l.calls[0].url).toBe("https://api.lever.co/v1/opportunities?perform_as=user-0001");
    expect((l.calls[0].init.body as FormData).get("postings[]")).toBe("p-1");
    const b = fake([new Response(JSON.stringify({ candidateId: 77 }), { status: 200 })]);
    expect(await pushCandidate("bamboohr", { config: { subdomain: "acme" }, secret: "key", fetch: b.f }, cand())).toEqual({ ok: true, externalId: "77" });
    expect((b.calls[0].init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("key:x").toString("base64")}`);
  });
  it("webhook: signed JSON body", async () => {
    const { f, calls } = fake([new Response(null, { status: 204 })]);
    expect(await pushCandidate("webhook", { config: { url: "https://hooks.example.com/x" }, secret: "s".repeat(16), fetch: f }, cand())).toEqual({ ok: true, externalId: null });
    const h = calls[0].init.headers as Record<string, string>;
    expect(h["X-Recrewted-Signature"]).toBe(webhookSignature("s".repeat(16), h["X-Recrewted-Timestamp"], String(calls[0].init.body)));
  });
  it("network errors are retried", async () => {
    const f = (async () => { throw new Error("ECONNRESET"); }) as unknown as Fetch;
    expect(await pushCandidate("webhook", { config: { url: "https://hooks.example.com/x" }, secret: "s", fetch: f }, cand())).toEqual({ ok: false, error: "ECONNRESET", retry: true });
  });
});

describe("settings", () => {
  it("validates per provider and blocks internal webhook targets", () => {
    const form = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
    expect(parseConfig("personio", form({ cfg_companyId: "42", cfg_subdomain: "Bad Name" }))).toEqual({ ok: false, field: "Personio-Subdomain" });
    expect(parseConfig("personio", form({ cfg_companyId: "42", cfg_extra: "x" }))).toEqual({ ok: true, config: { companyId: "42" } });
    expect(parseConfig("webhook", form({ cfg_url: "https://169.254.169.254/latest" })).ok).toBe(false);
    for (const bad of ["http://hooks.example.com", "https://localhost/x", "https://db.internal/x", "https://u:p@hooks.example.com", "https://[::1]/", "https://hooks.example.com:8443/"]) expect(isPublicHttpsUrl(bad)).toBe(false);
    expect(isPublicHttpsUrl("https://hooks.zapier.com/hooks/catch/1/abc")).toBe(true);
  });
});
