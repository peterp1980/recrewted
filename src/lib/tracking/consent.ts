// Consent cookie (F20): which categories the visitor allowed, plus a random
// visitor ID used only to record the decision in the consents table.

export const CONSENT_COOKIE = "rc_consent";
export const BANNER_VERSION = "2026-11-21";
export type Consent = { version: string; statistics: boolean; marketing: boolean; visitorId: string };

export function serializeConsent(c: Consent): string {
  return [c.version, c.statistics ? "1" : "0", c.marketing ? "1" : "0", c.visitorId].join(".");
}

/** Unknown or outdated cookies count as "no decision" so the banner asks again. */
export function parseConsent(raw: string | undefined | null): Consent | null {
  if (!raw) return null;
  const [version, s, m, visitorId] = decodeURIComponent(raw).split(".");
  if (version !== BANNER_VERSION || !/^[01]$/.test(s ?? "") || !/^[01]$/.test(m ?? "") || !/^[0-9a-f-]{36}$/.test(visitorId ?? "")) return null;
  // Marketing without statistics is not offered; treat it as statistics too.
  return { version, statistics: s === "1" || m === "1", marketing: m === "1", visitorId };
}
