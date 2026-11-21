// Own domains for career pages, e.g. karriere.hafermann-reisen.de (migration 0017).
// The customer points the domain at Vercel; the middleware maps it to /karriere/<slug>.

/** Vercel's targets for custom domains. */
export const VERCEL_CNAME = "cname.vercel-dns.com";
export const VERCEL_A = "76.76.21.21";

const HOST = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** "https://Karriere.Beispiel.de/jobs" → "karriere.beispiel.de". Null if it is not a usable hostname. */
export function normalizeDomain(input: string): string | null {
  const s = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/?#].*$/, "").replace(/:\d+$/, "").replace(/\.$/, "");
  if (!s) return null;
  if (!HOST.test(s) || isOwnHost(s)) return null;
  return s;
}

/** Our own hosts never count as customer domains. */
export function isOwnHost(host: string): boolean {
  const h = host.toLowerCase().replace(/:\d+$/, "");
  return h === "localhost" || h === "127.0.0.1" || h === "recrewted.de" || h.endsWith(".recrewted.de") || h.endsWith(".vercel.app");
}

/** A domain without subdomain (beispiel.de) needs an A record; subdomains a CNAME. Simple rule, fine for .de/.com/.eu. */
export const isApex = (domain: string) => domain.split(".").length === 2;

export type DnsRecord = { type: "A" | "CNAME"; name: string; value: string };

/** The record the customer sets at their DNS provider. */
export function dnsRecord(domain: string): DnsRecord {
  if (isApex(domain)) return { type: "A", name: "@", value: VERCEL_A };
  const labels = domain.split(".");
  return { type: "CNAME", name: labels.slice(0, -2).join("."), value: VERCEL_CNAME };
}
