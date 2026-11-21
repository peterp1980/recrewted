// Employee referrals: every referrer gets a personal code that travels as ?ref=… in the URL
// (no cookie) from the career page via the job ad into the application.

export const REF_PARAM = "ref";
const CODE = /^[a-z0-9]{8,16}$/;
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no 0/o, 1/l: codes get read out loud and typed

export const refParam = (v: unknown): string | null => (typeof v === "string" && CODE.test(v) ? v : null);

/** 10 characters from a 32-letter alphabet: 50 bits, unguessable enough for attribution. */
export function newReferralCode(): string {
  return [...crypto.getRandomValues(new Uint8Array(10))].map((b) => ALPHABET[b % 32]).join("");
}

/** Link a referrer shares: the career page (own domain if set), with the code attached. */
export function referralLink(careerBase: string, code: string): string {
  const url = new URL(careerBase);
  url.searchParams.set(REF_PARAM, code);
  return url.toString();
}

/** Appends ref (and keeps other params) to an internal link like "/jobs/x?quelle=karriereseite". */
export function withRef(href: string, code: string | null): string {
  if (!code) return href;
  const [path, query = ""] = href.split("?");
  const q = new URLSearchParams(query);
  q.set(REF_PARAM, code);
  return `${path}?${q.toString()}`;
}
