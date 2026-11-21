// Scorecard (F4): ratings 1–5 per criterion with a short reason; weighted mean.

export type Criterion = { id: string; name: string; description: string | null; weight: number };
export type Rating = { criterionId: string; rating: number; reason: string };

export const MIN_REASON = 3;
export const MAX_REASON = 500;

/**
 * Reads the rating form. A criterion may stay unrated (empty); a rating needs a
 * reason so the score stays explainable (EU AI Act, CLAUDE.md).
 */
export function parseRatings(form: FormData, criteria: Criterion[]): { ratings: Rating[]; missingReason: string[] } {
  const ratings: Rating[] = [];
  const missingReason: string[] = [];
  for (const c of criteria) {
    const r = Number(form.get(`r_${c.id}`));
    if (!Number.isInteger(r) || r < 1 || r > 5) continue;
    const reason = String(form.get(`why_${c.id}`) ?? "").trim().slice(0, MAX_REASON);
    if (reason.length < MIN_REASON) {
      missingReason.push(c.id);
      continue;
    }
    ratings.push({ criterionId: c.id, rating: r, reason });
  }
  return { ratings, missingReason };
}

/** Same formula as the database (private.recompute_score), for previews. */
export function weightedScore(criteria: Criterion[], ratings: { criterionId: string; rating: number }[]): number | null {
  let sum = 0;
  let weights = 0;
  for (const r of ratings) {
    const c = criteria.find((x) => x.id === r.criterionId);
    if (!c) continue;
    sum += r.rating * c.weight;
    weights += c.weight;
  }
  return weights ? Math.round((sum / weights) * 100) / 100 : null;
}

const one = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const scoreText = (score: number | null) => (score === null ? "–" : `${one.format(score)} von 5`);

export const RATING_LABELS: Record<number, string> = {
  1: "erfüllt nicht",
  2: "kaum",
  3: "teilweise",
  4: "gut",
  5: "voll und ganz",
};
