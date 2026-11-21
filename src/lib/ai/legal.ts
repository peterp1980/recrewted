import { findAggIssues, type AggCategory } from "@/lib/agg";

// Checks on AI output before a person even sees it. They do not replace the human review.

/** Criteria and questions that use protected characteristics (AGG) or obvious proxies are dropped. */
const PROXIES = /(?<![\p{L}])(?:alter|jahrgang|geburtsjahr|muttersprache|deutsch als erstsprache|nationalit|herkunft|geschlecht|familie|kinder|schwanger|religi|konfession|gesundheit|behinder|aussehen|foto|wohnort in|lücke(?:n)? im lebenslauf|berufseinsteiger|young|digital native)/iu;

export type Flagged<T> = { item: T; issues: (AggCategory | "proxy")[] };

export function screenItems<T>(items: T[], text: (t: T) => string): { ok: T[]; dropped: Flagged<T>[] } {
  const ok: T[] = [];
  const dropped: Flagged<T>[] = [];
  for (const item of items) {
    const s = text(item);
    const issues: (AggCategory | "proxy")[] = [...findAggIssues(s), ...(PROXIES.test(s) ? (["proxy"] as const) : [])];
    if (issues.length) dropped.push({ item, issues });
    else ok.push(item);
  }
  return { ok, dropped };
}

const norm = (s: string) => s.toLowerCase().replace(/[„“"'’‚]/g, "").replace(/\s+/g, " ").trim();

/**
 * A rating needs evidence. Quotes from the questionnaire must appear word for word in the answers;
 * quotes from the CV are marked as not machine-checked (the PDF goes to the model as a document).
 * Ratings without any verifiable quote are turned into "no assessment".
 */
export function verifyEvidence<R extends { rating: number | null; evidence: { source: string; quote: string }[] }>(
  r: R,
  answersText: string,
): R & { verified: boolean[]; downgraded: boolean } {
  const hay = norm(answersText);
  const verified = r.evidence.map((e) => (/lebenslauf/i.test(e.source) ? false : norm(e.quote).length >= 3 && hay.includes(norm(e.quote))));
  const hasCv = r.evidence.some((e) => /lebenslauf/i.test(e.source) && e.quote.trim().length >= 3);
  const rating = r.rating !== null && Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5 ? r.rating : null;
  const supported = verified.some(Boolean) || hasCv;
  return { ...r, rating: supported ? rating : null, verified, downgraded: rating !== null && !supported };
}
