// Knockout questions (F3): definition, form parsing and evaluation.

export type QuestionKind = "yes_no" | "choice" | "number";

export type KnockoutRule =
  | { exclude: "yes" | "no" } // yes_no
  | { excludeOptions: string[] } // choice
  | { min?: number; max?: number } // number
  | null;

export type ScreeningQuestion = {
  id: string;
  position: number;
  question: string;
  kind: QuestionKind;
  options: string[] | null;
  knockoutRule: KnockoutRule;
  /** Recommended questions (required = false) may stay unanswered and never exclude anyone. */
  required: boolean;
  /** Scorecard criterion the answer suggests a rating for (0018). */
  criterionId: string | null;
  /** Answer → suggested rating 1..5; keys "yes"/"no" or the choice options. */
  ratingMap: Record<string, number> | null;
};

export type Answer = boolean | string | number;

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown): number | undefined => {
  const s = str(v).replace(",", ".");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

/** Reads the recruiter's question form. Returns null if the question is incomplete. */
export function parseQuestionForm(form: FormData): Omit<ScreeningQuestion, "id" | "position"> | null {
  const question = str(form.get("question"));
  const kind = str(form.get("kind")) as QuestionKind;
  if (question.length < 5 || !["yes_no", "choice", "number"].includes(kind)) return null;
  // "Empfohlen": optional answer, no exclusion.
  const recommended = form.get("recommended") === "on";
  const criterionRaw = str(form.get("criterionId"));
  const criterionId = /^[0-9a-f-]{36}$/.test(criterionRaw) ? criterionRaw : null;
  const rating = (v: unknown) => { const n = num(v); return n !== undefined && Number.isInteger(n) && n >= 1 && n <= 5 ? n : undefined; };
  const extra = (ratingMap: Record<string, number> | null) => ({ required: !recommended, criterionId, ratingMap: criterionId && ratingMap && Object.keys(ratingMap).length ? ratingMap : null });

  if (kind === "yes_no") {
    const ex = str(form.get("excludeAnswer"));
    const map: Record<string, number> = {};
    const y = rating(form.get("ratingYes"));
    const n = rating(form.get("ratingNo"));
    if (y !== undefined) map.yes = y;
    if (n !== undefined) map.no = n;
    return { question, kind, options: null, knockoutRule: !recommended && (ex === "yes" || ex === "no") ? { exclude: ex } : null, ...extra(map) };
  }
  if (kind === "choice") {
    const options = [...new Set(str(form.get("options"), 2000).split(/\r?\n/).map((o) => o.trim().slice(0, 120)).filter(Boolean))].slice(0, 12);
    if (options.length < 2) return null;
    const excluded = str(form.get("excludeOptions"), 2000).split(/\r?\n/).map((o) => o.trim()).filter((o) => options.includes(o));
    // "Option = 4", one per line
    const map: Record<string, number> = {};
    for (const line of str(form.get("ratings"), 2000).split(/\r?\n/)) {
      const m = line.match(/^(.*?)\s*=\s*(\d)\s*$/);
      const r = m ? rating(m[2]) : undefined;
      if (m && r !== undefined && options.includes(m[1].trim())) map[m[1].trim()] = r;
    }
    return { question, kind, options, knockoutRule: !recommended && excluded.length ? { excludeOptions: excluded } : null, ...extra(map) };
  }
  const min = num(form.get("min"));
  const max = num(form.get("max"));
  if (min !== undefined && max !== undefined && min > max) return null;
  return { question, kind, options: null, knockoutRule: !recommended && (min !== undefined || max !== undefined) ? { ...(min !== undefined && { min }), ...(max !== undefined && { max }) } : null, ...extra(null) };
}

/** Reads a stored rating map (jsonb) defensively. */
export function toRatingMap(raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out = Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([, v]) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5)) as Record<string, number>;
  return Object.keys(out).length ? out : null;
}

/** Rating the answer suggests for the linked criterion, or null. The recruiter decides. */
export function suggestedRating(q: Pick<ScreeningQuestion, "kind" | "ratingMap">, answer: Answer | null | undefined): number | null {
  if (!q.ratingMap || answer === null || answer === undefined) return null;
  const key = q.kind === "yes_no" ? (answer === true ? "yes" : answer === false ? "no" : "") : String(answer);
  return q.ratingMap[key] ?? null;
}

/** Reads a stored rule (jsonb) defensively. */
export function toRule(kind: QuestionKind, raw: unknown): KnockoutRule {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (kind === "yes_no" && (r.exclude === "yes" || r.exclude === "no")) return { exclude: r.exclude };
  if (kind === "choice" && Array.isArray(r.excludeOptions)) return { excludeOptions: r.excludeOptions.filter((o): o is string => typeof o === "string") };
  if (kind === "number") {
    const out: { min?: number; max?: number } = {};
    if (typeof r.min === "number") out.min = r.min;
    if (typeof r.max === "number") out.max = r.max;
    return Object.keys(out).length ? out : null;
  }
  return null;
}

/** Reads the applicant's answer for one question from the application form. */
export function readAnswer(q: ScreeningQuestion, form: FormData): Answer | null {
  const v = form.get(`q_${q.id}`);
  if (q.kind === "yes_no") return v === "yes" ? true : v === "no" ? false : null;
  if (q.kind === "choice") {
    const s = str(v);
    return q.options?.includes(s) ? s : null;
  }
  const n = num(v);
  return n === undefined || n < 0 || n > 1_000_000 ? null : n;
}

/** True if the answer excludes the applicant. */
export function isKnockout(q: ScreeningQuestion, answer: Answer): boolean {
  const r = q.knockoutRule;
  if (!r) return false;
  if (q.kind === "yes_no" && "exclude" in r) return (r.exclude === "yes") === answer;
  if (q.kind === "choice" && "excludeOptions" in r) return r.excludeOptions.includes(String(answer));
  if (q.kind === "number" && typeof answer === "number" && !("exclude" in r) && !("excludeOptions" in r)) {
    return (r.min !== undefined && answer < r.min) || (r.max !== undefined && answer > r.max);
  }
  return false;
}

export type Evaluation = { answers: Map<string, Answer>; missing: string[]; knockouts: string[] };

/** Required questions must be answered (recommended ones may stay empty); returns failed knockout questions. */
export function evaluate(questions: ScreeningQuestion[], form: FormData): Evaluation {
  const answers = new Map<string, Answer>();
  const missing: string[] = [];
  const knockouts: string[] = [];
  for (const q of questions) {
    const a = readAnswer(q, form);
    if (a === null) {
      if (q.required) missing.push(q.id);
      continue;
    }
    answers.set(q.id, a);
    if (isKnockout(q, a)) knockouts.push(q.id);
  }
  return { answers, missing, knockouts };
}
