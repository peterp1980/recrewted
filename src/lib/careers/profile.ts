// Career page settings of a customer (migrations 0011–0013). The content itself is a
// document of sections in career_pages (see document.ts).

export type CareerSettings = {
  slug: string | null;
  enabled: boolean;
  brandColor: string | null;
  tone: "sie" | "du";
  /** Own domain for the career page, e.g. karriere.beispiel.de (0017). */
  domain: string | null;
};

import { normalizeDomain } from "./domain";

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

/** Image links: https or a path on this site. Anything else (javascript:, data:) is dropped. */
export const imageUrl = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim().slice(0, 500) : "";
  return /^(https:\/\/[^\s"'<>]+|\/[^\s"'<>]*)$/.test(s) ? s : null;
};

export type SettingsInput = { ok: true; value: CareerSettings } | { ok: false; error: "slug" | "color" | "domain" };

export function parseSettingsForm(form: FormData): SettingsInput {
  const slug = str(form.get("slug"), 60).toLowerCase();
  const color = str(form.get("brandColor"), 7);
  if (slug && !isSlug(slug)) return { ok: false, error: "slug" };
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return { ok: false, error: "color" };
  const enabled = form.get("enabled") === "on";
  if (enabled && !slug) return { ok: false, error: "slug" };
  const domainRaw = str(form.get("domain"), 260);
  const domain = domainRaw ? normalizeDomain(domainRaw) : null;
  if (domainRaw && !domain) return { ok: false, error: "domain" };
  return { ok: true, value: { slug: slug || null, enabled, brandColor: color || null, tone: form.get("tone") === "du" ? "du" : "sie", domain } };
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
