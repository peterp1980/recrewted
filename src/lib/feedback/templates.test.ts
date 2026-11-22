import { describe, expect, it } from "vitest";
import { findAggIssues } from "@/lib/agg";
import { defaultTemplate, feedbackTemplates } from "./templates";

describe("feedback templates", () => {
  const weak = [{ name: "Führerschein Klasse D", reason: "Nicht vorhanden" }];

  it("offers the scorecard reasons first when there are any, otherwise neutral", () => {
    const withReasons = feedbackTemplates("sie", weak);
    expect(defaultTemplate(withReasons)).toBe("criteria");
    expect(withReasons[0].text).toContain("– Führerschein Klasse D: Nicht vorhanden");
    const none = feedbackTemplates("sie", []);
    expect(none.map((t) => t.id)).toEqual(["neutral", "experience", "requirement", "filled", "encourage"]);
    expect(defaultTemplate(none)).toBe("neutral");
  });

  it("fills the requirement or leaves a visible placeholder", () => {
    expect(feedbackTemplates("sie", weak).find((t) => t.id === "requirement")!.text).toContain("Für die Stelle ist Führerschein Klasse D eine feste Voraussetzung");
    expect(feedbackTemplates("sie", []).find((t) => t.id === "requirement")!.text).toContain("[Anforderung aus der Stellenanzeige]");
  });

  it("speaks du or Sie consistently", () => {
    for (const t of feedbackTemplates("du", weak)) expect(t.text).not.toMatch(/\b(Sie|Ihre|Ihren|Ihrer|Ihnen)\b/);
    expect(feedbackTemplates("du", []).find((t) => t.id === "encourage")!.text).toContain("du dich wieder bewirbst");
    expect(feedbackTemplates("sie", []).find((t) => t.id === "encourage")!.text).toContain("Sie sich wieder bewerben");
  });

  it("passes the AGG check", () => {
    for (const tone of ["sie", "du"] as const) for (const t of feedbackTemplates(tone, weak)) expect(findAggIssues(t.text)).toEqual([]);
  });
});
