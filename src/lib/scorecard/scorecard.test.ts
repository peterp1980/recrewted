import { describe, expect, it } from "vitest";
import { parseRatings, scoreText, weightedScore, type Criterion } from "./ratings";
import { criteriaTemplate } from "./templates";

const criteria: Criterion[] = [
  { id: "a", name: "Ausbildung", description: null, weight: 2 },
  { id: "b", name: "Motivation", description: null, weight: 1 },
  { id: "c", name: "Verfügbarkeit", description: null, weight: 1 },
];
const form = (f: Record<string, string>) => {
  const d = new FormData();
  for (const [k, v] of Object.entries(f)) d.set(k, v);
  return d;
};

describe("parseRatings", () => {
  it("takes ratings with reasons and leaves empty criteria unrated", () => {
    const r = parseRatings(form({ r_a: "5", why_a: "IHK-Abschluss 2019", r_b: "", why_b: "", r_c: "9", why_c: "x" }), criteria);
    expect(r).toEqual({ ratings: [{ criterionId: "a", rating: 5, reason: "IHK-Abschluss 2019" }], missingReason: [] });
  });

  it("requires a reason for every rating", () => {
    expect(parseRatings(form({ r_a: "4", why_a: " " }), criteria)).toEqual({ ratings: [], missingReason: ["a"] });
  });
});

describe("weightedScore", () => {
  it("matches the database formula", () => {
    expect(weightedScore(criteria, [{ criterionId: "a", rating: 5 }, { criterionId: "b", rating: 2 }])).toBe(4);
    expect(weightedScore(criteria, [])).toBeNull();
  });

  it("formats in German", () => {
    expect(scoreText(4)).toBe("4,0 von 5");
    expect(scoreText(3.67)).toBe("3,7 von 5");
    expect(scoreText(null)).toBe("–");
  });
});

describe("templates", () => {
  it("offers field-specific and general criteria", () => {
    expect(criteriaTemplate("healthcare")[0].name).toBe("Examen bzw. Anerkennung");
    expect(criteriaTemplate(null).length).toBeGreaterThan(2);
    expect(criteriaTemplate("other")).toEqual(criteriaTemplate(null));
  });
});
