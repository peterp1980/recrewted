// Entry attribution (F12): UTM and click IDs from the landing URL, kept for 90
// days in a first-party cookie – only with marketing consent.
// Rule: last paid click wins; otherwise the last organic visit.

export const ATTR_COOKIE = "rc_attr";
export const ATTR_DAYS = 90;
const CLICK_IDS = ["gclid", "wbraid", "gbraid", "fbclid", "ttclid", "li_fat_id"] as const;
export type ClickIdType = (typeof CLICK_IDS)[number];

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  click_id_type?: ClickIdType;
  click_id?: string;
  paid: boolean;
  at: number;
};

const PAID_MEDIUM = /^(cpc|ppc|paid|paid_social|paidsocial|display|job_board)$/i;
const clean = (v: string | null) => (v ? v.slice(0, 100).replace(/[^\w.\-~ äöüÄÖÜß]/g, "") : undefined);

/** Reads a landing URL. Returns null when it carries no campaign information. */
export function fromUrl(search: string, now = Date.now()): Attribution | null {
  const p = new URLSearchParams(search);
  const a: Attribution = {
    utm_source: clean(p.get("utm_source")),
    utm_medium: clean(p.get("utm_medium")),
    utm_campaign: clean(p.get("utm_campaign")),
    utm_content: clean(p.get("utm_content")),
    paid: false,
    at: now,
  };
  for (const t of CLICK_IDS) {
    const v = p.get(t);
    if (v && /^[\w.\-~]{4,500}$/.test(v)) {
      a.click_id_type = t;
      a.click_id = v;
      break;
    }
  }
  a.paid = Boolean(a.click_id) || PAID_MEDIUM.test(a.utm_medium ?? "");
  return a.utm_source || a.click_id ? a : null;
}

/** Last paid click wins over a later organic visit while it is still valid. */
export function merge(existing: Attribution | null, incoming: Attribution | null, now = Date.now()): Attribution | null {
  const valid = existing && now - existing.at < ATTR_DAYS * 86_400_000 ? existing : null;
  if (!incoming) return valid;
  if (incoming.paid || !valid?.paid) return incoming;
  return valid;
}

export function parseAttribution(raw: string | undefined | null): Attribution | null {
  if (!raw) return null;
  try {
    const a = JSON.parse(decodeURIComponent(raw)) as Attribution;
    return typeof a === "object" && a && typeof a.at === "number" ? a : null;
  } catch {
    return null;
  }
}
