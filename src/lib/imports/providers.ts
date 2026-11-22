import { XMLParser } from "fast-xml-parser";
import { isPublicHttpsUrl } from "@/lib/ats/providers";
import { decodeEntities, employmentFrom, htmlToLines, remoteFrom, type ImportedJob } from "./normalize";

// Public job sources of our customers' own systems. All free and without keys; we fetch them only
// on the customer's behalf (contract), and only the handle the admin entered.

export const IMPORT_PROVIDERS = {
  personio: { name: "Personio", hint: "Firmenname aus der Karriereseite, z. B. „hafermann“ bei hafermann.jobs.personio.de" },
  greenhouse: { name: "Greenhouse", hint: "Board-Token, z. B. „acme“ bei boards.greenhouse.io/acme" },
  lever: { name: "Lever", hint: "Firmenname aus jobs.lever.co/<name> (EU-Konten: „eu:<name>“)" },
  smartrecruiters: { name: "SmartRecruiters", hint: "Company-ID aus jobs.smartrecruiters.com/<ID>" },
  recruitee: { name: "Recruitee", hint: "Subdomain aus <name>.recruitee.com" },
  workable: { name: "Workable", hint: "Konto aus apply.workable.com/<name>" },
  jsonld: { name: "Karriereseite (Google-for-Jobs-Daten)", hint: "https-Adresse der Karriereseite; wir lesen die JobPosting-Daten der Seite und der verlinkten Stellen" },
} as const;
export type ImportProvider = keyof typeof IMPORT_PROVIDERS;
export const isImportProvider = (v: string): v is ImportProvider => v in IMPORT_PROVIDERS;

/** Handles are plain slugs; the career page must be a public https URL. */
export function validSource(p: ImportProvider, s: string): boolean {
  if (p === "jsonld") return isPublicHttpsUrl(s) && s.length <= 300;
  if (p === "lever") return /^(eu:)?[a-z0-9][a-z0-9-]{0,80}$/i.test(s);
  return /^[a-z0-9][a-z0-9._-]{0,80}$/i.test(s);
}

export class ImportError extends Error {}

type F = typeof fetch;
const UA = "recrewted-import/1.0 (+https://recrewted.de)";

async function get(f: F, url: string, accept = "application/json"): Promise<Response> {
  let res: Response;
  try {
    res = await f(url, { headers: { Accept: accept, "User-Agent": UA }, signal: AbortSignal.timeout(15_000), cache: "no-store", redirect: "follow" });
  } catch (e) {
    throw new ImportError(`Quelle nicht erreichbar (${String(e).slice(0, 80)})`);
  }
  if (res.status === 404) throw new ImportError("Quelle nicht gefunden – Firmenname/Adresse prüfen.");
  if (!res.ok) throw new ImportError(`Quelle antwortet mit HTTP ${res.status}.`);
  return res;
}
const json = async (f: F, url: string) => (await get(f, url)).json() as Promise<unknown>;

type Any = Record<string, unknown>;
const o = (v: unknown): Any => (v && typeof v === "object" && !Array.isArray(v) ? (v as Any) : {});
const a = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);
const s = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && /^\d+(\.\d+)?$/.test(v) ? Number(v) : null);
const base = (): Omit<ImportedJob, "externalId" | "title" | "url" | "description"> => ({
  location: "", postalCode: "", remote: "onsite", employmentType: null, salaryMin: null, salaryMax: null, salaryPeriod: "year",
});

export function parsePersonio(xml: string, company: string): ImportedJob[] {
  const doc = new XMLParser({ ignoreAttributes: true, parseTagValue: false }).parse(xml) as Any;
  return a(o(doc["workzag-jobs"]).position).map((raw) => {
    const p = o(raw);
    const sections = a(o(p.jobDescriptions).jobDescription).map((d) => `<h3>${s(o(d).name)}</h3>${s(o(d).value)}`).join("");
    return {
      ...base(),
      externalId: s(p.id),
      title: s(p.name),
      url: `https://${company}.jobs.personio.de/job/${s(p.id)}`,
      location: s(p.office),
      employmentType: employmentFrom(s(p.schedule)) ?? employmentFrom(s(p.employmentType)),
      remote: remoteFrom(s(p.office)),
      description: sections,
    };
  });
}

export function parseGreenhouse(data: unknown): ImportedJob[] {
  return a(o(data).jobs).map((raw) => {
    const j = o(raw);
    return { ...base(), externalId: s(j.id), title: s(j.title), url: s(j.absolute_url) || null, location: s(o(j.location).name), remote: remoteFrom(s(o(j.location).name)), description: s(j.content) };
  });
}

export function parseLever(data: unknown): ImportedJob[] {
  return a(data).map((raw) => {
    const j = o(raw);
    const cat = o(j.categories);
    const lists = a(j.lists).map((l) => `<h3>${s(o(l).text)}</h3><ul>${s(o(l).content)}</ul>`).join("");
    const sal = o(j.salaryRange);
    return {
      ...base(),
      externalId: s(j.id), title: s(j.text), url: s(j.hostedUrl) || null, location: s(cat.location),
      employmentType: employmentFrom(s(cat.commitment)), remote: remoteFrom(s(j.workplaceType) || s(cat.location)),
      description: `${s(j.description)}${lists}${s(j.additional)}`,
      salaryMin: n(sal.min), salaryMax: n(sal.max), salaryPeriod: /hour/i.test(s(sal.interval)) ? "hour" : /month/i.test(s(sal.interval)) ? "month" : "year",
    };
  });
}

export function parseSmartRecruitersPosting(raw: unknown): ImportedJob {
  const j = o(raw);
  const loc = o(j.location);
  const sec = o(o(j.jobAd).sections);
  const part = (k: string, h: string) => (s(o(sec[k]).text) ? `<h3>${s(o(sec[k]).title) || h}</h3>${s(o(sec[k]).text)}` : "");
  return {
    ...base(),
    externalId: s(j.id), title: s(j.name), url: s(j.postingUrl) || s(j.ref) || null,
    location: s(loc.city), postalCode: s(loc.postalCode), remote: remoteFrom(null, loc.remote === true),
    employmentType: employmentFrom(s(o(j.typeOfEmployment).label)),
    description: [part("jobDescription", "Aufgaben"), part("qualifications", "Profil"), part("additionalInformation", "Wir bieten")].join(""),
  };
}

export function parseRecruitee(data: unknown): ImportedJob[] {
  return a(o(data).offers).map((raw) => {
    const j = o(raw);
    const sal = o(j.salary);
    return {
      ...base(),
      externalId: s(j.id), title: s(j.title), url: s(j.careers_url) || null,
      location: s(j.city) || s(j.location), postalCode: s(j.postal_code),
      remote: j.hybrid === true ? "hybrid" : remoteFrom(s(j.location), j.remote === true),
      employmentType: employmentFrom(s(j.employment_type_code)),
      description: `${s(j.description)}${s(j.requirements) ? `<h3>Anforderungen</h3>${s(j.requirements)}` : ""}`,
      salaryMin: n(sal.min), salaryMax: n(sal.max), salaryPeriod: /hour/i.test(s(sal.period)) ? "hour" : /month/i.test(s(sal.period)) ? "month" : "year",
    };
  });
}

export function parseWorkable(data: unknown): ImportedJob[] {
  return a(o(data).jobs).map((raw) => {
    const j = o(raw);
    return {
      ...base(),
      externalId: s(j.shortcode) || s(j.id), title: s(j.title), url: s(j.url) || s(j.shortlink) || null,
      location: s(j.city), remote: remoteFrom(null, j.telecommuting === true),
      employmentType: employmentFrom(s(j.employment_type)), description: s(j.description),
    };
  });
}

/** schema.org JobPosting objects from all ld+json blocks of a page (also inside @graph and arrays). */
export function jobPostingsFromHtml(html: string, pageUrl: string): ImportedJob[] {
  const out: ImportedJob[] = [];
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(visit);
    const j = o(v);
    if (a(j["@graph"]).length) a(j["@graph"]).forEach(visit);
    const type = a(j["@type"]).map(s);
    if (!type.includes("JobPosting")) return;
    const addr = o(o(a(j.jobLocation)[0]).address);
    const sal = o(o(j.baseSalary).value);
    const unit = s(sal.unitText);
    out.push({
      ...base(),
      externalId: s(o(j.identifier).value) || s(j.url) || pageUrl,
      title: s(j.title),
      url: s(j.url) || pageUrl,
      location: s(addr.addressLocality),
      postalCode: s(addr.postalCode),
      remote: s(j.jobLocationType) === "TELECOMMUTE" ? "remote" : "onsite",
      employmentType: employmentFrom(a(j.employmentType).map(s).join(" ")),
      description: s(j.description),
      salaryMin: n(sal.minValue) ?? n(sal.value),
      salaryMax: n(sal.maxValue) ?? n(sal.value),
      salaryPeriod: unit === "HOUR" ? "hour" : unit === "MONTH" ? "month" : "year",
    });
  };
  for (const b of blocks) {
    const body = b.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    try {
      visit(JSON.parse(body));
    } catch {
      // broken JSON on the page: skip this block
    }
  }
  return out;
}

/** Links on the same host that look like job pages. */
export function jobLinks(html: string, pageUrl: string, max = 30): string[] {
  const host = new URL(pageUrl).host;
  const seen = new Set<string>();
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    let u: URL;
    try {
      u = new URL(decodeEntities(m[1]), pageUrl);
    } catch {
      continue;
    }
    if (u.host !== host || u.protocol !== "https:" || u.href === pageUrl) continue;
    if (!/(job|stelle|karriere|career|vacanc|position|ausschreibung)/i.test(u.pathname)) continue;
    seen.add(u.href.split("#")[0]);
    if (seen.size >= max) break;
  }
  return [...seen];
}

export async function fetchJobs(p: ImportProvider, source: string, f: F = fetch): Promise<ImportedJob[]> {
  if (!validSource(p, source)) throw new ImportError("Ungültige Quelle.");
  switch (p) {
    case "personio": {
      const res = await get(f, `https://${source}.jobs.personio.de/xml?language=de`, "application/xml");
      return parsePersonio(await res.text(), source);
    }
    case "greenhouse":
      return parseGreenhouse(await json(f, `https://boards-api.greenhouse.io/v1/boards/${source}/jobs?content=true`));
    case "lever": {
      const eu = source.startsWith("eu:");
      return parseLever(await json(f, `https://api.${eu ? "eu." : ""}lever.co/v0/postings/${eu ? source.slice(3) : source}?mode=json`));
    }
    case "smartrecruiters": {
      const list = o(await json(f, `https://api.smartrecruiters.com/v1/companies/${source}/postings?limit=100`));
      const ids = a(list.content).map((x) => s(o(x).id)).filter(Boolean).slice(0, 60);
      const out: ImportedJob[] = [];
      for (const id of ids) out.push(parseSmartRecruitersPosting(await json(f, `https://api.smartrecruiters.com/v1/companies/${source}/postings/${id}`)));
      return out;
    }
    case "recruitee":
      return parseRecruitee(await json(f, `https://${source}.recruitee.com/api/offers/`));
    case "workable":
      return parseWorkable(await json(f, `https://apply.workable.com/api/v1/widget/accounts/${source}?details=true`));
    case "jsonld": {
      const html = await (await get(f, source, "text/html")).text();
      const found = jobPostingsFromHtml(html, source);
      if (found.length) return found;
      const out: ImportedJob[] = [];
      for (const link of jobLinks(html, source)) {
        try {
          out.push(...jobPostingsFromHtml(await (await get(f, link, "text/html")).text(), link));
        } catch {
          // one broken page does not stop the import
        }
      }
      return out;
    }
  }
}

/** Short summary for the admin list (first lines of the description). */
export const preview = (j: ImportedJob) => htmlToLines(j.description).slice(0, 3).join(" ").slice(0, 200);
