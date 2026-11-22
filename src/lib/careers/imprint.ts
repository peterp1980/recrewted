// Customer imprint for career pages on the customer's own domain (migration 0028).

export type ImprintInput = { imprint: string | null; imprintUrl: string | null };

/** Reads imprint text and link from the settings form. Text 30–5000 characters, link https only. */
export function parseImprint(form: FormData): { ok: true; value: ImprintInput } | { ok: false; error: "imprint" } {
  const text = String(form.get("imprint") ?? "").replace(/\r\n/g, "\n").trim();
  let url = String(form.get("imprintUrl") ?? "").trim();
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  if (text && (text.length < 30 || text.length > 5000)) return { ok: false, error: "imprint" };
  if (url && (!/^https:\/\/[^\s/]+\.[^\s]+$/.test(url) || url.length > 300)) return { ok: false, error: "imprint" };
  return { ok: true, value: { imprint: text || null, imprintUrl: url || null } };
}

/** The customer imprint applies only on their own, verified domain and only if they gave one. */
export function usesCustomerImprint(o: { career_domain: string | null; career_domain_verified_at: string | null; imprint: string | null; imprint_url: string | null }, host: string): boolean {
  return Boolean(o.career_domain && o.career_domain_verified_at && (o.imprint || o.imprint_url) && host === o.career_domain);
}
