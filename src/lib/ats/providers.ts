import { createHmac } from "node:crypto";

// Adapters for applicant tracking systems. Each takes the customer's settings and key and puts one
// candidate into the job's first stage there. Field names follow the vendors' public API docs
// (see docs/ats.md); every adapter has a cheap "test connection" call.

export const PROVIDERS = ["personio", "recruitee", "smartrecruiters", "lever", "bamboohr", "webhook"] as const;
export type Provider = (typeof PROVIDERS)[number];
export const isProvider = (v: unknown): v is Provider => typeof v === "string" && (PROVIDERS as readonly string[]).includes(v);

export type ConfigField = { key: string; label: string; hint?: string; pattern?: RegExp; required: boolean };
export type ProviderInfo = {
  name: string;
  secretLabel: string;
  secretHint: string;
  jobIdLabel: string;
  fields: ConfigField[];
  /** Whether a CV file is sent along (some APIs only take very small files or need extra calls). */
  sendsCv: boolean;
};

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const SUBDOMAIN = /^[a-z0-9][a-z0-9-]{0,62}$/;

export const PROVIDER_INFO: Record<Provider, ProviderInfo> = {
  personio: {
    name: "Personio",
    secretLabel: "API-Token (Recruiting-Integration)",
    secretHint: "In Personio unter Einstellungen › Sicherheit & Integrationen › API-Zugangsdaten › Recruiting-Integrationen.",
    jobIdLabel: "Personio-Stellen-ID (job_position_id)",
    fields: [
      { key: "companyId", label: "Company-ID", hint: "Steht neben dem Recruiting-Token.", pattern: /^\d{1,12}$/, required: true },
      { key: "subdomain", label: "Personio-Subdomain", hint: "Der Teil vor .jobs.personio.de – für den Verbindungstest und die Stellenliste.", pattern: SUBDOMAIN, required: false },
      { key: "channelId", label: "Kanal-ID „recrewted“ (optional)", hint: "Recruiting-Kanal in Personio, damit die Quelle stimmt.", pattern: /^\d{1,12}$/, required: false },
    ],
    sendsCv: true,
  },
  recruitee: {
    name: "Recruitee",
    secretLabel: "Personal API Token",
    secretHint: "In Recruitee unter Einstellungen › Apps und Plugins › Personal API Tokens.",
    jobIdLabel: "Recruitee-Offer-ID",
    fields: [{ key: "companyId", label: "Company-ID oder Subdomain", pattern: ID, required: true }],
    sendsCv: true,
  },
  smartrecruiters: {
    name: "SmartRecruiters",
    secretLabel: "API-Key (X-SmartToken)",
    secretHint: "In SmartRecruiters unter Settings › Credential Manager.",
    jobIdLabel: "SmartRecruiters-Job-ID",
    fields: [],
    sendsCv: false,
  },
  lever: {
    name: "Lever",
    secretLabel: "API-Key",
    secretHint: "Super Admin unter Settings › Integrations and API › API Credentials.",
    jobIdLabel: "Lever-Posting-ID",
    fields: [{ key: "performAs", label: "Lever-User-ID (perform_as)", hint: "In wessen Namen die Kandidaten angelegt werden.", pattern: /^[A-Za-z0-9-]{8,64}$/, required: true }],
    sendsCv: true,
  },
  bamboohr: {
    name: "BambooHR",
    secretLabel: "API-Key",
    secretHint: "In BambooHR über Ihr Profil › API Keys; der Nutzer braucht Zugriff auf Hiring.",
    jobIdLabel: "BambooHR-Job-ID",
    fields: [{ key: "subdomain", label: "BambooHR-Subdomain", hint: "Der Teil vor .bamboohr.com.", pattern: SUBDOMAIN, required: true }],
    sendsCv: true,
  },
  webhook: {
    name: "Anderes System (Webhook)",
    secretLabel: "Signatur-Schlüssel",
    secretHint: "Frei wählbar, mindestens 16 Zeichen. Jede Übertragung trägt eine HMAC-SHA256-Signatur im Header X-Recrewted-Signature. Passt für softgarden, rexx, d.vinci, JOIN, Greenhouse u. a. über Zapier, Make oder n8n.",
    jobIdLabel: "Stellen-ID im Zielsystem (optional)",
    fields: [{ key: "url", label: "Webhook-URL (https)", pattern: /^https:\/\/[^\s/$.?#][^\s]{3,500}$/, required: true }],
    sendsCv: true,
  },
};

export type Candidate = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobId: string | null;
  jobTitle: string;
  /** Short text: where the candidate comes from and the link to the scorecard at recrewted. */
  note: string;
  cv: { bytes: Uint8Array; filename: string; contentType: string; url: string } | null;
};
export type PushResult = { ok: true; externalId: string | null } | { ok: false; error: string; retry: boolean };
export type Fetch = typeof fetch;
type Ctx = { config: Record<string, string>; secret: string; fetch: Fetch };

const TIMEOUT = 20_000;
const req = (f: Fetch, url: string, init: RequestInit) => f(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) });

async function fail(res: Response, what: string): Promise<PushResult> {
  const body = (await res.text().catch(() => "")).slice(0, 300);
  // 4xx (except rate limit) will not get better by retrying: wrong key, unknown job, ...
  return { ok: false, error: `${what}: HTTP ${res.status}${body ? ` – ${body}` : ""}`, retry: res.status === 429 || res.status >= 500 };
}
const idOf = (j: unknown, ...keys: string[]): string | null => {
  let cur: unknown = j;
  for (const k of keys) cur = cur && typeof cur === "object" ? (cur as Record<string, unknown>)[k] : undefined;
  return typeof cur === "string" || typeof cur === "number" ? String(cur) : null;
};
const blob = (cv: NonNullable<Candidate["cv"]>) => new Blob([cv.bytes as BlobPart], { type: cv.contentType });

// --- Personio (Recruiting API v1; v2 has no write endpoint yet) ---
const personioHeaders = (c: Ctx) => ({ Authorization: `Bearer ${c.secret}`, "X-Company-ID": c.config.companyId, "X-Personio-App-ID": "RECREWTED", Accept: "application/json" });
async function personio(c: Ctx, cand: Candidate): Promise<PushResult> {
  if (!cand.jobId || !/^\d+$/.test(cand.jobId)) return { ok: false, error: "Personio-Stellen-ID fehlt an der Vakanz.", retry: false };
  if (!cand.email) return { ok: false, error: "Personio verlangt eine E-Mail-Adresse.", retry: false };
  const files: { uuid: string; original_filename: string; category: string }[] = [];
  if (cand.cv) {
    const fd = new FormData();
    fd.append("file", blob(cand.cv), cand.cv.filename);
    const up = await req(c.fetch, "https://api.personio.de/v1/recruiting/applications/documents", { method: "POST", headers: personioHeaders(c), body: fd });
    if (!up.ok) return fail(up, "Personio Lebenslauf");
    const uuid = idOf(await up.json().catch(() => null), "uuid");
    if (uuid) files.push({ uuid, original_filename: cand.cv.filename, category: "cv" });
  }
  const body = {
    first_name: cand.firstName,
    last_name: cand.lastName,
    email: cand.email,
    job_position_id: Number(cand.jobId),
    ...(c.config.channelId ? { recruiting_channel_id: Number(c.config.channelId) } : {}),
    ...(cand.phone ? { phone: cand.phone } : {}),
    message: cand.note,
    ...(files.length ? { files } : {}),
  };
  const res = await req(c.fetch, "https://api.personio.de/v1/recruiting/applications", { method: "POST", headers: { ...personioHeaders(c), "Content-Type": "application/json" }, body: JSON.stringify(body) });
  // Personio answers 201 without an id.
  return res.ok ? { ok: true, externalId: null } : fail(res, "Personio");
}

// --- Recruitee ---
async function recruitee(c: Ctx, cand: Candidate): Promise<PushResult> {
  if (!cand.jobId || !/^\d+$/.test(cand.jobId)) return { ok: false, error: "Recruitee-Offer-ID fehlt an der Vakanz.", retry: false };
  const body = {
    candidate: {
      name: `${cand.firstName} ${cand.lastName}`,
      emails: cand.email ? [cand.email] : [],
      phones: cand.phone ? [cand.phone] : [],
      sources: ["recrewted"],
      cover_letter: cand.note,
      ...(cand.cv ? { remote_cv_url: cand.cv.url } : {}),
    },
    offers: [Number(cand.jobId)],
  };
  const res = await req(c.fetch, `https://api.recruitee.com/c/${encodeURIComponent(c.config.companyId)}/candidates`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.secret}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok ? { ok: true, externalId: idOf(await res.json().catch(() => null), "candidate", "id") } : fail(res, "Recruitee");
}

// --- SmartRecruiters (CV not sent: 2 MB limit and separate call; the note links to it at recrewted) ---
async function smartrecruiters(c: Ctx, cand: Candidate): Promise<PushResult> {
  if (!cand.jobId || !/^[A-Za-z0-9-]{1,64}$/.test(cand.jobId)) return { ok: false, error: "SmartRecruiters-Job-ID fehlt an der Vakanz.", retry: false };
  if (!cand.email) return { ok: false, error: "SmartRecruiters verlangt eine E-Mail-Adresse.", retry: false };
  const body = { firstName: cand.firstName, lastName: cand.lastName, email: cand.email, ...(cand.phone ? { phoneNumber: cand.phone } : {}) };
  const res = await req(c.fetch, `https://api.smartrecruiters.com/jobs/${encodeURIComponent(cand.jobId)}/candidates`, {
    method: "POST",
    headers: { "X-SmartToken": c.secret, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok ? { ok: true, externalId: idOf(await res.json().catch(() => null), "id") } : fail(res, "SmartRecruiters");
}

// --- Lever ---
const basic = (user: string, pass = "") => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
async function lever(c: Ctx, cand: Candidate): Promise<PushResult> {
  if (!cand.jobId) return { ok: false, error: "Lever-Posting-ID fehlt an der Vakanz.", retry: false };
  const fd = new FormData();
  fd.append("name", `${cand.firstName} ${cand.lastName}`);
  if (cand.email) fd.append("emails[]", cand.email);
  if (cand.phone) fd.append("phones[]", cand.phone);
  fd.append("postings[]", cand.jobId);
  fd.append("sources[]", "recrewted");
  if (cand.cv) fd.append("resumeFile", blob(cand.cv), cand.cv.filename);
  const res = await req(c.fetch, `https://api.lever.co/v1/opportunities?perform_as=${encodeURIComponent(c.config.performAs)}`, { method: "POST", headers: { Authorization: basic(c.secret) }, body: fd });
  return res.ok ? { ok: true, externalId: idOf(await res.json().catch(() => null), "data", "id") } : fail(res, "Lever");
}

// --- BambooHR ---
async function bamboohr(c: Ctx, cand: Candidate): Promise<PushResult> {
  if (!cand.jobId || !/^\d+$/.test(cand.jobId)) return { ok: false, error: "BambooHR-Job-ID fehlt an der Vakanz.", retry: false };
  const fd = new FormData();
  fd.append("firstName", cand.firstName);
  fd.append("lastName", cand.lastName);
  if (cand.email) fd.append("email", cand.email);
  if (cand.phone) fd.append("phoneNumber", cand.phone);
  fd.append("jobId", cand.jobId);
  fd.append("source", "recrewted");
  if (cand.cv) fd.append("resume", blob(cand.cv), cand.cv.filename);
  const res = await req(c.fetch, `https://${c.config.subdomain}.bamboohr.com/api/v1/applicant_tracking/application`, { method: "POST", headers: { Authorization: basic(c.secret, "x"), Accept: "application/json" }, body: fd });
  return res.ok ? { ok: true, externalId: idOf(await res.json().catch(() => null), "candidateId") } : fail(res, "BambooHR");
}

// --- Generic webhook ---
export function webhookSignature(secret: string, timestamp: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}
async function postWebhook(c: Ctx, payload: unknown): Promise<Response> {
  const body = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  return req(c.fetch, c.config.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Recrewted-Timestamp": ts, "X-Recrewted-Signature": webhookSignature(c.secret, ts, body) },
    body,
  });
}
async function webhook(c: Ctx, cand: Candidate): Promise<PushResult> {
  const res = await postWebhook(c, {
    event: "candidate.handover",
    candidate: { firstName: cand.firstName, lastName: cand.lastName, email: cand.email, phone: cand.phone },
    job: { id: cand.jobId, title: cand.jobTitle },
    note: cand.note,
    // Short-lived link (1 hour); the receiver should download the file right away.
    cv: cand.cv ? { url: cand.cv.url, filename: cand.cv.filename, contentType: cand.cv.contentType } : null,
    source: "recrewted",
  });
  return res.ok ? { ok: true, externalId: null } : fail(res, "Webhook");
}

const PUSH: Record<Provider, (c: Ctx, cand: Candidate) => Promise<PushResult>> = { personio, recruitee, smartrecruiters, lever, bamboohr, webhook };

export async function pushCandidate(provider: Provider, ctx: Ctx, cand: Candidate): Promise<PushResult> {
  try {
    return await PUSH[provider](ctx, cand);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler", retry: true };
  }
}

export type TestResult = { ok: boolean; message: string; jobs?: { id: string; title: string }[] };

/** Read-only call that proves the settings work; lists open jobs where the API allows it. */
export async function testConnection(provider: Provider, c: Ctx): Promise<TestResult> {
  try {
    switch (provider) {
      case "personio": {
        // v1 has no read endpoint with this token; the public job feed shows the IDs to map.
        if (!c.config.subdomain) return { ok: true, message: "Gespeichert. Personio bietet für dieses Token keinen Testaufruf – geprüft wird bei der ersten Übergabe. Mit Subdomain zeigen wir hier die Stellen-IDs." };
        const res = await req(c.fetch, `https://${c.config.subdomain}.jobs.personio.de/xml`, { headers: { Accept: "application/xml" } });
        if (!res.ok) return { ok: false, message: `Stellenfeed nicht erreichbar (HTTP ${res.status}). Stimmt die Subdomain?` };
        const xml = await res.text();
        const jobs = [...xml.matchAll(/<position>[\s\S]*?<id>(\d+)<\/id>[\s\S]*?<name>([\s\S]*?)<\/name>/g)].map((m) => ({ id: m[1], title: m[2].replace(/<!\[CDATA\[|\]\]>/g, "").trim() }));
        return { ok: true, message: `Stellenfeed gelesen: ${jobs.length} veröffentlichte Stellen. Das Token selbst wird bei der ersten Übergabe geprüft.`, jobs };
      }
      case "recruitee": {
        const res = await req(c.fetch, `https://api.recruitee.com/c/${encodeURIComponent(c.config.companyId)}/offers`, { headers: { Authorization: `Bearer ${c.secret}`, Accept: "application/json" } });
        if (!res.ok) return { ok: false, message: `Recruitee antwortet mit HTTP ${res.status}.` };
        const j = (await res.json().catch(() => ({}))) as { offers?: { id: number; title: string; status?: string }[] };
        const jobs = (j.offers ?? []).filter((o) => !o.status || o.status === "published").map((o) => ({ id: String(o.id), title: o.title }));
        return { ok: true, message: `Verbunden: ${jobs.length} veröffentlichte Stellen.`, jobs };
      }
      case "smartrecruiters": {
        const res = await req(c.fetch, "https://api.smartrecruiters.com/jobs?limit=100", { headers: { "X-SmartToken": c.secret, Accept: "application/json" } });
        if (!res.ok) return { ok: false, message: `SmartRecruiters antwortet mit HTTP ${res.status}.` };
        const j = (await res.json().catch(() => ({}))) as { content?: { id: string; title: string }[] };
        const jobs = (j.content ?? []).map((o) => ({ id: o.id, title: o.title }));
        return { ok: true, message: `Verbunden: ${jobs.length} Stellen.`, jobs };
      }
      case "lever": {
        const res = await req(c.fetch, "https://api.lever.co/v1/postings?state=published&limit=100", { headers: { Authorization: basic(c.secret) } });
        if (!res.ok) return { ok: false, message: `Lever antwortet mit HTTP ${res.status}.` };
        const j = (await res.json().catch(() => ({}))) as { data?: { id: string; text: string }[] };
        const jobs = (j.data ?? []).map((o) => ({ id: o.id, title: o.text }));
        return { ok: true, message: `Verbunden: ${jobs.length} veröffentlichte Stellen.`, jobs };
      }
      case "bamboohr": {
        const res = await req(c.fetch, `https://${c.config.subdomain}.bamboohr.com/api/v1/applicant_tracking/jobs?statusGroups=Open`, { headers: { Authorization: basic(c.secret, "x"), Accept: "application/json" } });
        if (!res.ok) return { ok: false, message: `BambooHR antwortet mit HTTP ${res.status}.` };
        const j = (await res.json().catch(() => [])) as { id: number; title?: { label?: string } | string }[];
        const jobs = (Array.isArray(j) ? j : []).map((o) => ({ id: String(o.id), title: typeof o.title === "string" ? o.title : (o.title?.label ?? String(o.id)) }));
        return { ok: true, message: `Verbunden: ${jobs.length} offene Stellen.`, jobs };
      }
      case "webhook": {
        const res = await postWebhook(c, { event: "test", source: "recrewted" });
        return res.ok ? { ok: true, message: "Test-Aufruf angekommen." } : { ok: false, message: `Webhook antwortet mit HTTP ${res.status}.` };
      }
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error && e.name === "TimeoutError" ? "Keine Antwort (Zeitüberschreitung)." : "Nicht erreichbar." };
  }
}

/** Validates the settings form for a provider; returns only known keys. */
export function parseConfig(provider: Provider, form: FormData): { ok: true; config: Record<string, string> } | { ok: false; field: string } {
  const config: Record<string, string> = {};
  for (const f of PROVIDER_INFO[provider].fields) {
    const v = String(form.get(`cfg_${f.key}`) ?? "").trim();
    if (!v) {
      if (f.required) return { ok: false, field: f.label };
      continue;
    }
    if (f.pattern && !f.pattern.test(v)) return { ok: false, field: f.label };
    if (f.key === "url" && !isPublicHttpsUrl(v)) return { ok: false, field: f.label };
    config[f.key] = v;
  }
  return { ok: true, config };
}

/** The server calls this URL: only public https hosts by name, no IPs, localhost or internal names. */
export function isPublicHttpsUrl(v: string): boolean {
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return false;
  }
  const h = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return false;
  if (/^[\d.]+$/.test(h) || h.includes(":") || !h.includes(".")) return false;
  return !/(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(h);
}
