import { describe, expect, it } from "vitest";
import { autoPoints, normalizeAnswer, parseQuestionForm, score, summarizeEvents, toQuestion, type Question } from "./model";

const q = (o: Partial<Parameters<typeof toQuestion>[0]>): Question =>
  toQuestion({ id: "q", position: 1, kind: "single", prompt: "Frage?", case_text: "", options: ["A", "B", "C"], correct: "B", points: 2, ...o });

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("questions", () => {
  it("reads rows defensively", () => {
    expect(q({ correct: "X" }).correct).toBeNull();
    expect(q({ kind: "yes_no", options: null, correct: "no" })).toMatchObject({ options: ["yes", "no"], correct: "no" });
    expect(q({ kind: "multi", correct: ["A", "Z", "C"] }).correct).toEqual(["A", "C"]);
    expect(q({ kind: "nonsense" }).kind).toBe("text");
  });
});

describe("answers", () => {
  it("accepts only fitting answers", () => {
    expect(normalizeAnswer(q({}), "B")).toBe("B");
    expect(normalizeAnswer(q({}), "Z")).toBeUndefined();
    expect(normalizeAnswer(q({ kind: "multi" }), ["A", "A", "C"])).toEqual(["A", "C"]);
    expect(normalizeAnswer(q({ kind: "multi" }), ["A", "Z"])).toBeUndefined();
    expect(normalizeAnswer(q({ kind: "text" }), "x".repeat(20000))).toHaveLength(10000);
    expect(normalizeAnswer(q({ kind: "upload" }), "evil")).toBeUndefined();
    expect(normalizeAnswer(q({}), "")).toBeNull();
  });

  it("scores closed questions automatically, open ones never", () => {
    expect(autoPoints(q({}), "B")).toBe(2);
    expect(autoPoints(q({}), "A")).toBe(0);
    expect(autoPoints(q({}), null)).toBe(0);
    expect(autoPoints(q({ kind: "multi", correct: ["A", "C"] }), ["C", "A"])).toBe(2);
    expect(autoPoints(q({ kind: "multi", correct: ["A", "C"] }), ["A"])).toBe(0);
    expect(autoPoints(q({ kind: "text" }), "gute Antwort")).toBeNull();
    expect(autoPoints(q({ correct: null }), "B")).toBeNull();
  });

  it("sums points and counts what a person still has to score", () => {
    const qs = [q({ id: "1" }), q({ id: "2", kind: "text", correct: null, points: 5 }), q({ id: "3", kind: "upload", correct: null, points: 3 })];
    const s = score(qs, new Map([
      ["1", { auto: 2, manual: null, hasAnswer: true }],
      ["2", { auto: null, manual: null, hasAnswer: true }],
      ["3", { auto: null, manual: 3, hasAnswer: true }],
    ]));
    expect(s).toEqual({ auto: 2, manual: 3, max: 10, open: 1 });
  });

  it("summarizes the browser log", () => {
    expect(summarizeEvents([{ type: "left_window" }, { type: "tab_hidden" }, { type: "paste" }, { type: "copy" }, { type: "returned" }])).toEqual({ left: 2, paste: 1, copy: 1, other: 0 });
  });
});

describe("test builder form", () => {
  it("builds the different kinds", () => {
    expect(parseQuestionForm(form({ kind: "single", prompt: "Welche?", options: "A\nB\nA", correct: "B", points: "2,5" }))).toEqual({
      ok: true, value: { kind: "single", prompt: "Welche?", caseText: "", options: ["A", "B"], correct: "B", points: 2.5 },
    });
    expect(parseQuestionForm(form({ kind: "multi", prompt: "Welche?", options: "A\nB\nC", correct: "A\nC" }))).toMatchObject({ ok: true, value: { correct: ["A", "C"] } });
    expect(parseQuestionForm(form({ kind: "yes_no", prompt: "Stimmt das?", correct: "yes" }))).toMatchObject({ ok: true, value: { options: ["yes", "no"], correct: "yes" } });
    expect(parseQuestionForm(form({ kind: "case", prompt: "Lösen Sie den Fall.", caseText: "Ein Kunde möchte …" }))).toMatchObject({ ok: true, value: { kind: "case", correct: null } });
    expect(parseQuestionForm(form({ kind: "upload", prompt: "Laden Sie Ihre Präsentation hoch." }))).toMatchObject({ ok: true, value: { kind: "upload", options: [] } });
  });
  it("rejects incomplete questions", () => {
    expect(parseQuestionForm(form({ kind: "single", prompt: "Welche?", options: "A" })).ok).toBe(false);
    expect(parseQuestionForm(form({ kind: "case", prompt: "Fall", caseText: "kurz" })).ok).toBe(false);
    expect(parseQuestionForm(form({ kind: "essay", prompt: "Schreiben" })).ok).toBe(false);
    expect(parseQuestionForm(form({ kind: "text", prompt: "Warum?", points: "0" })).ok).toBe(false);
  });
});
