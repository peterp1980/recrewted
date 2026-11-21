// Assessments (migration 0015): task types, answer checks and automatic points.
// Only closed questions get points automatically; open answers, cases and uploads are scored by a person.

export const QUESTION_KINDS = ["yes_no", "single", "multi", "text", "case", "upload"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];
export const CLOSED: readonly QuestionKind[] = ["yes_no", "single", "multi"];
export const isClosed = (k: QuestionKind) => CLOSED.includes(k);

export type Question = {
  id: string;
  position: number;
  kind: QuestionKind;
  prompt: string;
  caseText: string;
  options: string[];
  /** yes_no: "yes" | "no"; single: option; multi: options. Null = no automatic scoring. */
  correct: string | string[] | null;
  points: number;
};

/** An answer as stored: yes_no "yes"/"no", single string, multi string[], text/case string, upload {name}. */
export type Answer = string | string[] | { file: string } | null;

export const EVENT_TYPES = ["left_window", "returned", "tab_hidden", "tab_visible", "paste", "copy", "cut", "context_menu", "fullscreen_exit"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Allowed upload types for work samples (same list as the private bucket). */
export const UPLOAD_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "image/png": "png",
  "image/jpeg": "jpg",
};
export const UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
export const TEXT_MAX = 10000;
/** Answers may still arrive this long after the deadline (network, clicking "submit"). */
export const GRACE_SECONDS = 30;
/** Unstarted links stop working after this many days. */
export const LINK_DAYS = 14;

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean) : []);

export function toQuestion(row: { id: string; position: number; kind: string; prompt: string; case_text: string | null; options: unknown; correct: unknown; points: number | string }): Question {
  const kind = (QUESTION_KINDS as readonly string[]).includes(row.kind) ? (row.kind as QuestionKind) : "text";
  const options = kind === "yes_no" ? ["yes", "no"] : strings(row.options);
  let correct: Question["correct"] = null;
  if (kind === "multi") correct = strings(row.correct).filter((c) => options.includes(c));
  else if ((kind === "single" || kind === "yes_no") && typeof row.correct === "string" && options.includes(row.correct)) correct = row.correct;
  if (Array.isArray(correct) && correct.length === 0) correct = null;
  return { id: row.id, position: row.position, kind, prompt: row.prompt, caseText: row.case_text ?? "", options, correct, points: Number(row.points) || 1 };
}

/** Normalises what the browser sends. Returns undefined for answers that do not fit the question. */
export function normalizeAnswer(q: Question, raw: unknown): Answer | undefined {
  if (raw === null || raw === "") return null;
  switch (q.kind) {
    case "yes_no":
    case "single":
      return typeof raw === "string" && q.options.includes(raw) ? raw : undefined;
    case "multi": {
      const v = strings(raw);
      return v.every((x) => q.options.includes(x)) ? [...new Set(v)] : undefined;
    }
    case "text":
    case "case":
      return typeof raw === "string" ? raw.slice(0, TEXT_MAX) : undefined;
    case "upload":
      return undefined; // uploads are stored by the upload flow, not as an answer value
  }
}

/** Points for a closed question; null when a person has to score it. */
export function autoPoints(q: Question, a: Answer): number | null {
  if (!isClosed(q.kind) || q.correct === null) return null;
  if (a === null) return 0;
  if (q.kind === "multi") {
    const want = new Set(q.correct as string[]);
    const got = new Set(Array.isArray(a) ? a : []);
    return want.size === got.size && [...want].every((x) => got.has(x)) ? q.points : 0;
  }
  return a === q.correct ? q.points : 0;
}

export type Score = { auto: number; manual: number | null; max: number; open: number };

/** Sum of points. "open" counts answers that still need a person. */
export function score(questions: Question[], answers: Map<string, { auto: number | null; manual: number | null; hasAnswer: boolean }>): Score {
  let auto = 0;
  let manual: number | null = null;
  let open = 0;
  for (const q of questions) {
    const a = answers.get(q.id);
    if (isClosed(q.kind) && q.correct !== null) auto += a?.auto ?? 0;
    else if (a?.manual !== null && a?.manual !== undefined) manual = (manual ?? 0) + a.manual;
    else if (a?.hasAnswer) open += 1;
  }
  return { auto, manual, max: questions.reduce((s, q) => s + q.points, 0), open };
}

/** How often the candidate left the window, pasted or copied – shown to the recruiter, never used for points. */
export function summarizeEvents(events: { type: string }[]) {
  const count = (types: string[]) => events.filter((e) => types.includes(e.type)).length;
  return { left: count(["left_window", "tab_hidden"]), paste: count(["paste"]), copy: count(["copy", "cut"]), other: count(["context_menu", "fullscreen_exit"]) };
}

/** Parses the question form of the test builder. */
export function parseQuestionForm(form: FormData): { ok: true; value: Omit<Question, "id" | "position"> } | { ok: false } {
  const kind = String(form.get("kind") ?? "");
  if (!(QUESTION_KINDS as readonly string[]).includes(kind)) return { ok: false };
  const k = kind as QuestionKind;
  const prompt = String(form.get("prompt") ?? "").trim().slice(0, 2000);
  const caseText = String(form.get("caseText") ?? "").trim().slice(0, 10000);
  const options = k === "yes_no" ? ["yes", "no"] : [...new Set(String(form.get("options") ?? "").split(/\r?\n/).map((o) => o.trim().slice(0, 200)).filter(Boolean))].slice(0, 12);
  const points = Number(String(form.get("points") ?? "1").replace(",", "."));
  if (prompt.length < 3 || !Number.isFinite(points) || points <= 0 || points > 100) return { ok: false };
  if ((k === "single" || k === "multi") && options.length < 2) return { ok: false };
  const correctRaw = String(form.get("correct") ?? "").split(/\r?\n/).map((c) => c.trim()).filter(Boolean);
  let correct: Question["correct"] = null;
  if (k === "multi") correct = correctRaw.filter((c) => options.includes(c));
  else if (k === "single" || k === "yes_no") correct = correctRaw.find((c) => options.includes(c)) ?? null;
  if (Array.isArray(correct) && correct.length === 0) correct = null;
  if (k === "case" && caseText.length < 10) return { ok: false };
  return { ok: true, value: { kind: k, prompt, caseText: k === "case" ? caseText : "", options: k === "single" || k === "multi" || k === "yes_no" ? options : [], correct, points: Math.round(points * 10) / 10 } };
}
