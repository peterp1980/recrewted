import { describe, expect, it } from "vitest";
import { evaluate, isKnockout, parseQuestionForm, suggestedRating, toRatingMap, toRule, type ScreeningQuestion } from "./rules";

const base = { required: true, criterionId: null, ratingMap: null };

const form = (f: Record<string, string>) => {
  const d = new FormData();
  for (const [k, v] of Object.entries(f)) d.set(k, v);
  return d;
};

const yn: ScreeningQuestion = { id: "a", position: 1, question: "Führerschein B?", kind: "yes_no", options: null, knockoutRule: { exclude: "no" }, ...base };
const choice: ScreeningQuestion = { id: "b", position: 2, question: "Schicht?", kind: "choice", options: ["Früh", "Spät", "Keine"], knockoutRule: { excludeOptions: ["Keine"] }, ...base };
const number: ScreeningQuestion = { id: "c", position: 3, question: "Jahre Erfahrung?", kind: "number", options: null, knockoutRule: { min: 2 }, ...base };
const info: ScreeningQuestion = { id: "d", position: 4, question: "Wochenstunden?", kind: "number", options: null, knockoutRule: null, ...base };

describe("parseQuestionForm", () => {
  it("reads yes/no, choice and number questions", () => {
    expect(parseQuestionForm(form({ question: "Führerschein Klasse B?", kind: "yes_no", excludeAnswer: "no" }))).toEqual({
      question: "Führerschein Klasse B?", kind: "yes_no", options: null, knockoutRule: { exclude: "no" }, ...base,
    });
    expect(parseQuestionForm(form({ question: "Welche Schicht?", kind: "choice", options: "Früh\nSpät\nKeine\nFrüh", excludeOptions: "Keine\nUnbekannt" }))).toEqual({
      question: "Welche Schicht?", kind: "choice", options: ["Früh", "Spät", "Keine"], knockoutRule: { excludeOptions: ["Keine"] }, ...base,
    });
    expect(parseQuestionForm(form({ question: "Jahre Erfahrung?", kind: "number", min: "2", max: "" }))).toMatchObject({ knockoutRule: { min: 2 } });
  });

  it("rejects incomplete questions", () => {
    expect(parseQuestionForm(form({ question: "Kurz", kind: "yes_no" }))).toBeNull();
    expect(parseQuestionForm(form({ question: "Welche Schicht?", kind: "choice", options: "Nur eine" }))).toBeNull();
    expect(parseQuestionForm(form({ question: "Jahre Erfahrung?", kind: "number", min: "5", max: "2" }))).toBeNull();
  });
});

describe("knockouts", () => {
  it("applies each rule type", () => {
    expect(isKnockout(yn, false)).toBe(true);
    expect(isKnockout(yn, true)).toBe(false);
    expect(isKnockout(choice, "Keine")).toBe(true);
    expect(isKnockout(choice, "Früh")).toBe(false);
    expect(isKnockout(number, 1)).toBe(true);
    expect(isKnockout(number, 2)).toBe(false);
    expect(isKnockout(info, 0)).toBe(false);
  });

  it("evaluates a whole form and reports missing answers", () => {
    const r = evaluate([yn, choice, number, info], form({ q_a: "yes", q_b: "Keine", q_c: "3,5" }));
    expect(r.knockouts).toEqual(["b"]);
    expect(r.missing).toEqual(["d"]);
    expect(r.answers.get("c")).toBe(3.5);
  });

  it("ignores answers that are not offered", () => {
    expect(evaluate([choice], form({ q_b: "Nacht" })).missing).toEqual(["b"]);
  });

  it("reads stored rules defensively", () => {
    expect(toRule("yes_no", { exclude: "no" })).toEqual({ exclude: "no" });
    expect(toRule("yes_no", { exclude: "maybe" })).toBeNull();
    expect(toRule("number", { min: "2" })).toBeNull();
    expect(toRule("choice", { excludeOptions: ["A", 3] })).toEqual({ excludeOptions: ["A"] });
  });
});

const CRIT = "11111111-1111-1111-1111-111111111111";

describe("recommended questions (0018)", () => {
  it("never exclude, may stay unanswered and carry a rating suggestion", () => {
    const q = parseQuestionForm(form({ question: "Busführerschein Klasse D?", kind: "yes_no", recommended: "on", excludeAnswer: "no", criterionId: CRIT, ratingYes: "5", ratingNo: "1" }));
    expect(q).toEqual({ question: "Busführerschein Klasse D?", kind: "yes_no", options: null, knockoutRule: null, required: false, criterionId: CRIT, ratingMap: { yes: 5, no: 1 } });
    const full = { ...q!, id: "r", position: 5 };
    expect(evaluate([full], form({}))).toEqual({ answers: new Map(), missing: [], knockouts: [] });
    expect(evaluate([full], form({ q_r: "no" })).knockouts).toEqual([]);
    expect(suggestedRating(full, true)).toBe(5);
    expect(suggestedRating(full, false)).toBe(1);
    expect(suggestedRating(full, null)).toBeNull();
  });

  it("reads choice ratings and ignores unknown options and bad values", () => {
    const q = parseQuestionForm(form({ question: "Welche Klasse?", kind: "choice", options: "D\nDE\nKeine", criterionId: CRIT, ratings: "D = 4\nDE=5\nKeine = 9\nX = 3" }));
    expect(q?.ratingMap).toEqual({ D: 4, DE: 5 });
    expect(suggestedRating({ kind: "choice", ratingMap: q!.ratingMap }, "DE")).toBe(5);
  });

  it("drops ratings without a criterion and reads stored maps defensively", () => {
    expect(parseQuestionForm(form({ question: "Busführerschein?", kind: "yes_no", ratingYes: "5" }))?.ratingMap).toBeNull();
    expect(toRatingMap({ yes: 5, no: 0, x: "3" })).toEqual({ yes: 5 });
    expect(toRatingMap([])).toBeNull();
  });
});
