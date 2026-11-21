// Career page profile of a customer (migration 0011). Fixed layout, content per organization.

export type Benefit = { title: string; text: string };
export type Fact = { value: string; label: string };
export type Testimonial = { quote: string; name: string; role: string; photo: string | null };

export type CareerProfile = {
  slug: string | null;
  enabled: boolean;
  headline: string;
  intro: string;
  benefits: Benefit[];
  office: string;
  contact: string;
  brandColor: string | null;
  tone: "sie" | "du";
  logoUrl: string | null;
  heroUrl: string | null;
  facts: Fact[];
  testimonials: Testimonial[];
};

export const MAX_BENEFITS = 12;
export const MAX_FACTS = 4;
export const MAX_TESTIMONIALS = 6;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** URL-safe short name: "projx GmbH" → "projx-gmbh". */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export const isSlug = (s: string) => /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(s);

/** One benefit per line, "Title: text" (text optional). */
export function parseBenefits(text: string): Benefit[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, MAX_BENEFITS)
    .map((l) => {
      const i = l.indexOf(":");
      return i > 0 ? { title: l.slice(0, i).trim().slice(0, 80), text: l.slice(i + 1).trim().slice(0, 300) } : { title: l.slice(0, 80), text: "" };
    });
}

export const benefitsToText = (b: Benefit[]) => b.map((x) => (x.text ? `${x.title}: ${x.text}` : x.title)).join("\n");

/** Benefits as stored (jsonb); tolerant against unexpected shapes. */
export function benefitsFromStored(v: unknown): Benefit[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({ title: str(x.title, 80), text: str(x.text, 300) }))
    .filter((x) => x.title)
    .slice(0, MAX_BENEFITS);
}

/** Image links: https or a path on this site. Anything else (javascript:, data:) is dropped. */
export const imageUrl = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim().slice(0, 500) : "";
  return /^(https:\/\/[^\s"'<>]+|\/[^\s"'<>]*)$/.test(s) ? s : null;
};

/** One fact per line: "111 Jahre | Familientradition". */
export function parseFacts(text: string): Fact[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter(([v, l]) => v && l)
    .slice(0, MAX_FACTS)
    .map(([v, l]) => ({ value: v.slice(0, 20), label: l.slice(0, 120) }));
}
export const factsToText = (f: Fact[]) => f.map((x) => `${x.value} | ${x.label}`).join("\n");
export function factsFromStored(v: unknown): Fact[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({ value: str(x.value, 20), label: str(x.label, 120) }))
    .filter((x) => x.value && x.label)
    .slice(0, MAX_FACTS);
}

/**
 * Quotes separated by a blank line. First line "Name | Rolle | Foto-Link (optional)",
 * the following lines are the quote.
 */
export function parseTestimonials(text: string): Testimonial[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim().split(/\r?\n/))
    .filter((lines) => lines.length >= 2)
    .slice(0, MAX_TESTIMONIALS)
    .map(([head, ...rest]) => {
      const [name = "", role = "", photo = ""] = head.split("|").map((x) => x.trim());
      return { name: name.slice(0, 80), role: role.slice(0, 120), photo: imageUrl(photo), quote: rest.join(" ").trim().slice(0, 1200) };
    })
    .filter((t) => t.name && t.quote);
}
export const testimonialsToText = (t: Testimonial[]) =>
  t.map((x) => `${[x.name, x.role, x.photo ?? ""].join(" | ").replace(/( \| )+$/, "")}\n${x.quote}`).join("\n\n");
export function testimonialsFromStored(v: unknown): Testimonial[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({ quote: str(x.quote, 1200), name: str(x.name, 80), role: str(x.role, 120), photo: imageUrl(x.photo) }))
    .filter((x) => x.name && x.quote)
    .slice(0, MAX_TESTIMONIALS);
}

export type ProfileInput = { ok: true; value: CareerProfile } | { ok: false; error: "slug" | "color" | "image" };

export function parseProfileForm(form: FormData): ProfileInput {
  const slug = str(form.get("slug"), 60).toLowerCase();
  const color = str(form.get("brandColor"), 7);
  if (slug && !isSlug(slug)) return { ok: false, error: "slug" };
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return { ok: false, error: "color" };
  const enabled = form.get("enabled") === "on";
  if (enabled && !slug) return { ok: false, error: "slug" };
  const logoRaw = str(form.get("logoUrl"), 500);
  const heroRaw = str(form.get("heroUrl"), 500);
  if ((logoRaw && !imageUrl(logoRaw)) || (heroRaw && !imageUrl(heroRaw))) return { ok: false, error: "image" };
  return {
    ok: true,
    value: {
      slug: slug || null,
      enabled,
      headline: str(form.get("headline"), 150),
      intro: str(form.get("intro"), 2000),
      benefits: parseBenefits(str(form.get("benefits"), 5000)),
      office: str(form.get("office"), 1000),
      contact: str(form.get("contact"), 300),
      brandColor: color || null,
      tone: form.get("tone") === "du" ? "du" : "sie",
      logoUrl: imageUrl(logoRaw),
      heroUrl: imageUrl(heroRaw),
      facts: parseFacts(str(form.get("facts"), 2000)),
      testimonials: parseTestimonials(str(form.get("testimonials"), 10000)),
    },
  };
}

/** Text colour that stays readable on the brand colour (WCAG relative luminance). */
export function onColor(hex: string): "#ffffff" | "#1f2328" {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  // Contrast with white: 1.05 / (lum + 0.05); with ink (#1f2328, lum ≈ 0.016): (lum + 0.05) / 0.066.
  return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.066 ? "#ffffff" : "#1f2328";
}

/** Entry points a job link can carry (?quelle=…), mapped to the DB enum. */
export const ENTRY_PARAM = { karriereseite: "career_page", widget: "widget" } as const;
export type EntryParam = keyof typeof ENTRY_PARAM;
export const entryParam = (v: unknown): EntryParam | null => (typeof v === "string" && Object.hasOwn(ENTRY_PARAM, v) ? (v as EntryParam) : null);

/** Embed code for the customer's website. The script only resizes the frame. */
export function embedCode(baseUrl: string, slug: string, orgName: string): string {
  const src = `${baseUrl}/widget/${slug}`;
  const title = `Offene Stellen bei ${orgName}`.replace(/"/g, "&quot;");
  return [
    `<iframe id="recrewted-jobs" src="${src}" title="${title}" loading="lazy" style="width:100%;border:0;min-height:320px"></iframe>`,
    `<script>addEventListener("message",function(e){if(e.origin!=="${baseUrl}"||!e.data||e.data.type!=="recrewted:height")return;var f=document.getElementById("recrewted-jobs");if(f)f.style.height=e.data.height+"px"});</script>`,
  ].join("\n");
}

/** Public storage bucket for career page images (migration 0013). */
export const CAREER_BUCKET = "career-media";
