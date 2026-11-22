import { describe, expect, it } from "vitest";
import { aiConfig, modelId, modelLabel, scoringProviderOk } from "./config";
import { screenItems, verifyEvidence } from "./legal";
import { PROMPTS } from "./prompts";

describe("ai config", () => {
  it("is off unless enabled, EU Bedrock by default", () => {
    expect(aiConfig({})).toBeNull();
    const c = aiConfig({ AI_ENABLED: "true" })!;
    expect(c).toEqual({ provider: "bedrock", model: "claude-opus-5-5", region: "eu-central-1" });
    expect(modelId(c)).toBe("anthropic.claude-opus-5-5");
    expect(modelLabel(c)).toBe("bedrock:eu-central-1:anthropic.claude-opus-5-5");
    expect(modelId(aiConfig({ AI_ENABLED: "true", AI_PROVIDER: "anthropic" })!)).toBe("claude-opus-5-5");
    expect(aiConfig({ AI_ENABLED: "true", AI_MODEL: "gpt; drop" })).toBeNull();
    // Rating suggestions with the direct API only after explicit approval.
    const direct = aiConfig({ AI_ENABLED: "true", AI_PROVIDER: "anthropic" })!;
    expect([scoringProviderOk(direct, {}), scoringProviderOk(direct, { AI_SCORING_APPROVED: "true" }), scoringProviderOk(c, {})]).toEqual([false, true, true]);
  });
  it("versions every prompt and states the AGG rules", () => {
    for (const p of Object.values(PROMPTS)) {
      expect(p.version).toMatch(/^[a-z]+-\d{4}-\d{2}-\d{2}$/);
      expect(p.system).toContain("AGG");
    }
    expect(PROMPTS.scorecard_rating.system).toContain("rating auf null");
  });
});

describe("legal screening of suggestions", () => {
  it("drops criteria with protected characteristics or proxies", () => {
    const r = screenItems(
      [{ name: "Führerschein Klasse D" }, { name: "Deutsch als Muttersprache" }, { name: "Passt ins junge Team" }, { name: "Geburtsjahr nach 1990" }, { name: "Erfahrung im Kundenservice" }],
      (x) => x.name,
    );
    expect(r.ok.map((x) => x.name)).toEqual(["Führerschein Klasse D", "Erfahrung im Kundenservice"]);
    expect(r.dropped).toHaveLength(3);
  });

  it("keeps a rating only with evidence; questionnaire quotes are checked word for word", () => {
    const answers = "Haben Sie einen Busführerschein (D)? Ja\nWie viele Jahre Erfahrung? 6 Jahre im Reiseverkehr";
    expect(verifyEvidence({ rating: 5, evidence: [{ source: "Fragebogen", quote: "6 Jahre im Reiseverkehr" }] }, answers)).toMatchObject({ rating: 5, verified: [true], downgraded: false });
    expect(verifyEvidence({ rating: 4, evidence: [{ source: "Fragebogen", quote: "10 Jahre Fernverkehr" }] }, answers)).toMatchObject({ rating: null, downgraded: true });
    expect(verifyEvidence({ rating: 3, evidence: [] }, answers)).toMatchObject({ rating: null, downgraded: true });
    expect(verifyEvidence({ rating: 4, evidence: [{ source: "Lebenslauf", quote: "2019–2024 Busfahrer bei X" }] }, answers)).toMatchObject({ rating: 4, verified: [false], downgraded: false });
    expect(verifyEvidence({ rating: 9, evidence: [{ source: "Lebenslauf", quote: "abc" }] }, answers).rating).toBeNull();
  });
});
