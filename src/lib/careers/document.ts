// Career page document: an ordered list of sections, stored as JSON in career_pages (migration 0014).
// Everything that comes in (editor, database) goes through sanitizeDocument: unknown types are dropped,
// texts are trimmed and capped, image links must be https or site paths, video IDs must look like YouTube IDs.

import { imageUrl } from "./profile";

export const SECTION_TYPES = ["hero", "facts", "jobs", "benefits", "text", "testimonials", "gallery", "video", "faq", "process", "locations", "contact"] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export type Item = { title: string; text: string };
export type Fact = { value: string; label: string };
export type Voice = { quote: string; name: string; role: string; photo: string | null };
export type Picture = { url: string; alt: string };
export type Faq = { q: string; a: string };
export type Place = { name: string; address: string };

export type SectionData = {
  hero: { headline: string; text: string; imageUrl: string | null };
  facts: { items: Fact[] };
  jobs: { title: string; text: string };
  benefits: { title: string; items: Item[] };
  text: { title: string; body: string; imageUrl: string | null };
  testimonials: { title: string; items: Voice[] };
  gallery: { title: string; images: Picture[] };
  video: { title: string; youtubeId: string; text: string };
  faq: { title: string; items: Faq[] };
  process: { title: string; steps: Item[] };
  locations: { title: string; items: Place[] };
  contact: { title: string; office: string; contact: string };
};

export type Section<T extends SectionType = SectionType> = { id: string; type: T; visible: boolean; data: SectionData[T] };
export type CareerDocument = { v: 1; logoUrl: string | null; sections: Section[] };

export const MAX_SECTIONS = 20;
const MAX_ITEMS = 12;

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Raw) : {});
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? v.map(obj).slice(0, MAX_ITEMS) : []);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Accepts a YouTube ID or a usual YouTube link and returns the 11-character ID. */
export function youtubeId(v: unknown): string {
  const s = str(v, 300);
  const m = s.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/) ?? s.match(/^([\w-]{11})$/);
  return m ? m[1] : "";
}

const SANITIZE: { [K in SectionType]: (d: Raw) => SectionData[K] } = {
  hero: (d) => ({ headline: str(d.headline, 150), text: str(d.text, 600), imageUrl: imageUrl(d.imageUrl) }),
  facts: (d) => ({ items: arr(d.items).slice(0, 4).map((x) => ({ value: str(x.value, 20), label: str(x.label, 120) })).filter((x) => x.value || x.label) }),
  jobs: (d) => ({ title: str(d.title, 120), text: str(d.text, 400) }),
  benefits: (d) => ({ title: str(d.title, 120), items: arr(d.items).map((x) => ({ title: str(x.title, 80), text: str(x.text, 300) })).filter((x) => x.title || x.text) }),
  text: (d) => ({ title: str(d.title, 120), body: str(d.body, 4000), imageUrl: imageUrl(d.imageUrl) }),
  testimonials: (d) => ({
    title: str(d.title, 120),
    items: arr(d.items).slice(0, 6).map((x) => ({ quote: str(x.quote, 1200), name: str(x.name, 80), role: str(x.role, 120), photo: imageUrl(x.photo) })).filter((x) => x.quote || x.name),
  }),
  gallery: (d) => ({ title: str(d.title, 120), images: arr(d.images).flatMap((x) => { const url = imageUrl(x.url); return url ? [{ url, alt: str(x.alt, 200) }] : []; }) }),
  video: (d) => ({ title: str(d.title, 120), youtubeId: youtubeId(d.youtubeId), text: str(d.text, 600) }),
  faq: (d) => ({ title: str(d.title, 120), items: arr(d.items).map((x) => ({ q: str(x.q, 200), a: str(x.a, 1200) })).filter((x) => x.q || x.a) }),
  process: (d) => ({ title: str(d.title, 120), steps: arr(d.steps).slice(0, 6).map((x) => ({ title: str(x.title, 80), text: str(x.text, 300) })).filter((x) => x.title || x.text) }),
  locations: (d) => ({ title: str(d.title, 120), items: arr(d.items).map((x) => ({ name: str(x.name, 120), address: str(x.address, 300) })).filter((x) => x.name || x.address) }),
  contact: (d) => ({ title: str(d.title, 120), office: str(d.office, 1000), contact: str(d.contact, 300) }),
};

const isType = (v: unknown): v is SectionType => typeof v === "string" && (SECTION_TYPES as readonly string[]).includes(v);

export function sanitizeSection(raw: unknown): Section | null {
  const s = obj(raw);
  if (!isType(s.type)) return null;
  const id = /^[\w-]{1,40}$/.test(String(s.id ?? "")) ? String(s.id) : `${s.type}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, type: s.type, visible: s.visible !== false, data: SANITIZE[s.type](obj(s.data)) } as Section;
}

export function sanitizeDocument(raw: unknown): CareerDocument {
  const d = obj(raw);
  const seen = new Set<string>();
  const sections = (Array.isArray(d.sections) ? d.sections : [])
    .map(sanitizeSection)
    .filter((s): s is Section => s !== null)
    .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
    .slice(0, MAX_SECTIONS);
  return { v: 1, logoUrl: imageUrl(d.logoUrl), sections };
}

/** Empty section of a type, with German defaults the editor shows. */
export function newSection(type: SectionType, id: string): Section {
  const defaults: { [K in SectionType]: SectionData[K] } = {
    hero: { headline: "", text: "", imageUrl: null },
    facts: { items: [{ value: "", label: "" }] },
    jobs: { title: "Offene Stellen", text: "" },
    benefits: { title: "Was wir bieten", items: [{ title: "", text: "" }] },
    text: { title: "", body: "", imageUrl: null },
    testimonials: { title: "Aus dem Team", items: [{ quote: "", name: "", role: "", photo: null }] },
    gallery: { title: "Einblicke", images: [] },
    video: { title: "", youtubeId: "", text: "" },
    faq: { title: "Häufige Fragen", items: [{ q: "", a: "" }] },
    process: { title: "So läuft die Bewerbung ab", steps: [{ title: "Bewerbung in zwei Minuten", text: "" }, { title: "Rückmeldung", text: "" }, { title: "Kennenlernen", text: "" }] },
    locations: { title: "Standorte", items: [{ name: "", address: "" }] },
    contact: { title: "", office: "", contact: "" },
  };
  return { id, type, visible: true, data: defaults[type] } as Section;
}

/** A page needs a hero and the job list; everything else is optional. */
export function starterDocument(): CareerDocument {
  return { v: 1, logoUrl: null, sections: [newSection("hero", "hero"), newSection("jobs", "jobs"), newSection("benefits", "benefits"), newSection("contact", "contact")] };
}
