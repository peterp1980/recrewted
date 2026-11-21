import { describe, expect, it } from "vitest";
import { displayName, letter, pseudonyms } from "./blind";

describe("blind review pseudonyms", () => {
  it("letters in shortlist order, stable", () => {
    expect([0, 1, 25, 26, 27].map(letter)).toEqual(["A", "B", "Z", "AA", "AB"]);
    const m = pseudonyms([
      { id: "b", shortlisted_at: "2026-11-02T00:00:00Z" },
      { id: "a", shortlisted_at: "2026-11-01T00:00:00Z" },
      { id: "x", shortlisted_at: null },
    ]);
    expect([...m]).toEqual([["a", "Kandidat:in A"], ["b", "Kandidat:in B"]]);
    expect(displayName(null, m.get("b"))).toBe("Kandidat:in B");
    expect(displayName({ first_name: "Kai", last_name: "K" }, m.get("b"))).toBe("Kai K");
  });
});
