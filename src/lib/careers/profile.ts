// Career page profile of a customer (migration 0011). Fixed layout, content per organization.

export type Benefit = { title: string; text: string };

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
};

export const MAX_BENEFITS = 12;

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

export type ProfileInput = { ok: true; value: CareerProfile } | { ok: false; error: "slug" | "color" };

export function parseProfileForm(form: FormData): ProfileInput {
  const slug = str(form.get("slug"), 60).toLowerCase();
  const color = str(form.get("brandColor"), 7);
  if (slug && !isSlug(slug)) return { ok: false, error: "slug" };
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return { ok: false, error: "color" };
  const enabled = form.get("enabled") === "on";
  if (enabled && !slug) return { ok: false, error: "slug" };
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
