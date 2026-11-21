import { describe, expect, it } from "vitest";
import { findAggIssues } from "./agg";

describe("findAggIssues", () => {
  it.each([
    ["Junges, dynamisches Team", "age"],
    ["Ältere Bewerber eher nicht", "age"],
    ["zwischen 25-35 Jahre", "age"],
    ["Deutsch als Muttersprache", "origin"],
    ["Muttersprachlerin Englisch", "origin"],
    ["Bewerbung mit Foto", "appearance"],
    ["nur Frauen", "gender"],
    ["verheiratet bevorzugt", "family"],
    ["christliche Werte", "religion"],
  ])("flags %s", (text, category) => {
    expect(findAggIssues(text)).toContain(category);
  });

  it.each([
    "Abgeschlossene Ausbildung als Elektroniker",
    "Deutsch auf C1-Niveau",
    "Führerschein Klasse B",
    "3 Jahre Berufserfahrung im Vertrieb",
  ])("does not flag %s", (text) => {
    expect(findAggIssues(text)).toEqual([]);
  });

  it("does not match inside other words", () => {
    expect(findAggIssues("Gewichtung der Aufgaben")).toEqual([]);
    expect(findAggIssues("Lediglich Teamarbeit")).toEqual([]);
  });
});
