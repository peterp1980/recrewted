import { describe, expect, it } from "vitest";
import { emptyBriefing, fromStored, missingForSubmit, parseBriefingForm, type Briefing } from "./schema";
import { flaggedItems, suggestCriteria, suggestQuestions } from "./suggestions";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

const complete: Briefing = {
  ...emptyBriefing(),
  title: "Elektroniker (m/w/d)",
  employmentType: "full_time",
  category: "craft",
  location: "München",
  postalCode: "80331",
  tasks: ["Wartung von Anlagen"],
  mustHave: ["Ausbildung als Elektroniker", "Führerschein Klasse B"],
  niceToHave: ["SPS-Kenntnisse"],
  salaryMin: 42000,
  salaryMax: 52000,
  contactName: "Kai Kunde",
  contactEmail: "kai@kunde.de",
};

describe("parseBriefingForm", () => {
  it("reads lists line by line, strips bullets and duplicates", () => {
    const b = parseBriefingForm(form({ mustHave: "- Ausbildung\n• Führerschein\n\nAusbildung\n" }));
    expect(b.mustHave).toEqual(["Ausbildung", "Führerschein"]);
  });

  it("reads German number formats", () => {
    const b = parseBriefingForm(form({ salaryMin: "42.000", salaryMax: "52.500,50 €" }));
    expect(b.salaryMin).toBe(42000);
    expect(b.salaryMax).toBe(52500.5);
  });

  it("ignores unknown option values", () => {
    const b = parseBriefingForm(form({ employmentType: "slave", remote: "mars", salaryPeriod: "decade" }));
    expect(b.employmentType).toBeNull();
    expect(b.remote).toBe("onsite");
    expect(b.salaryPeriod).toBe("year");
  });

  it("round-trips through storage", () => {
    expect(fromStored(JSON.parse(JSON.stringify(complete)))).toEqual(complete);
    expect(fromStored(null)).toEqual(emptyBriefing());
    expect(fromStored({ tasks: "kein Array", salaryMin: "5" })).toMatchObject({ tasks: [], salaryMin: null });
  });
});

describe("missingForSubmit", () => {
  it("accepts a complete briefing", () => {
    expect(missingForSubmit(complete)).toEqual([]);
  });

  it("requires salary (pay transparency) and a valid range", () => {
    expect(missingForSubmit({ ...complete, salaryMax: null })).toContain("salary");
    expect(missingForSubmit({ ...complete, salaryMin: null, salaryMax: null })).toEqual([]);
    expect(missingForSubmit({ ...complete, salaryMin: 60000 })).toContain("salaryRange");
  });

  it("does not need a location for fully remote jobs", () => {
    expect(missingForSubmit({ ...complete, location: "", postalCode: "", remote: "remote" })).toEqual([]);
    expect(missingForSubmit({ ...complete, location: "" })).toContain("location");
    expect(missingForSubmit({ ...complete, postalCode: "8033" })).toContain("postalCode");
  });

  it("lists everything missing on an empty briefing", () => {
    expect(missingForSubmit(emptyBriefing())).toEqual(["title", "employmentType", "category", "location", "postalCode", "tasks", "mustHave", "contactName", "contactEmail"]);
  });
});

describe("suggestions", () => {
  it("turns must-haves and the location into knockout questions", () => {
    expect(suggestQuestions(complete).map((q) => q.question)).toEqual([
      "Bringen Sie Folgendes mit: Ausbildung als Elektroniker?",
      "Bringen Sie Folgendes mit: Führerschein Klasse B?",
      "Können Sie in München arbeiten?",
    ]);
  });

  it("weights must-haves higher than nice-to-haves", () => {
    expect(suggestCriteria(complete).map((c) => [c.name, c.weight])).toEqual([
      ["Ausbildung als Elektroniker", 2],
      ["Führerschein Klasse B", 2],
      ["SPS-Kenntnisse", 1],
      ["Motivation und Passung zur Aufgabe", 1],
    ]);
  });

  it("never suggests discriminatory criteria and reports them", () => {
    const b = { ...complete, mustHave: ["Deutsch als Muttersprache", "Führerschein Klasse B"] };
    expect(suggestQuestions(b).map((q) => q.question).join(" ")).not.toContain("Muttersprache");
    expect(suggestCriteria(b).map((c) => c.name)).not.toContain("Deutsch als Muttersprache");
    expect(flaggedItems(b)).toEqual(["Deutsch als Muttersprache"]);
  });

  it("caps the number of suggestions", () => {
    const many = { ...complete, mustHave: Array.from({ length: 12 }, (_, i) => `Kriterium ${i}`) };
    expect(suggestQuestions(many)).toHaveLength(6);
    expect(suggestCriteria(many)).toHaveLength(8);
  });
});
