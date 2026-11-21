import type { Category } from "@/lib/briefing/schema";

// Starting points for scorecard criteria per occupational field. Recruiters
// adjust them per vacancy; role-specific must-haves come from the briefing.

type T = { name: string; description: string; weight: number };

const GENERAL: T[] = [
  { name: "Fachliche Qualifikation", description: "Ausbildung, Abschluss oder gleichwertige Erfahrung für die Aufgaben", weight: 2 },
  { name: "Relevante Berufserfahrung", description: "Erfahrung mit vergleichbaren Aufgaben", weight: 2 },
  { name: "Motivation und Passung zur Aufgabe", description: "Warum diese Stelle, Bezug zu den Aufgaben", weight: 1 },
  { name: "Verfügbarkeit", description: "Starttermin und Arbeitszeit passen", weight: 1 },
];

const BY_CATEGORY: Partial<Record<Category, T[]>> = {
  craft: [
    { name: "Abgeschlossene Ausbildung im Handwerk", description: "Gesellen- oder Meisterbrief bzw. gleichwertig", weight: 2 },
    { name: "Praktische Erfahrung", description: "Selbstständiges Arbeiten auf Baustelle oder in der Werkstatt", weight: 2 },
    { name: "Führerschein und Mobilität", description: "Wenn die Stelle Fahrten zu Kunden verlangt", weight: 1 },
    { name: "Sorgfalt und Arbeitssicherheit", description: "Erfahrung mit Vorschriften und Dokumentation", weight: 1 },
  ],
  healthcare: [
    { name: "Examen bzw. Anerkennung", description: "Staatlich anerkannte Ausbildung oder Anerkennung", weight: 3 },
    { name: "Erfahrung im Fachbereich", description: "Station, Bereich oder Patientengruppe", weight: 2 },
    { name: "Bereitschaft zu Schichtdienst", description: "Passt zum Dienstmodell der Stelle", weight: 1 },
    { name: "Kommunikation mit Patienten und Team", description: "Beispiele aus der Praxis", weight: 1 },
  ],
  it: [
    { name: "Technische Kenntnisse", description: "Sprachen, Werkzeuge und Systeme aus dem Suchprofil", weight: 3 },
    { name: "Projekterfahrung", description: "Vergleichbare Projekte, Rolle darin", weight: 2 },
    { name: "Arbeitsweise im Team", description: "Zusammenarbeit, Code-Reviews, Dokumentation", weight: 1 },
  ],
  sales: [
    { name: "Vertriebserfahrung", description: "Branche, Zielgruppe, Erfolge", weight: 2 },
    { name: "Kommunikationsstärke", description: "Wie überzeugend und klar im Kontakt", weight: 2 },
    { name: "Eigenständigkeit", description: "Selbst organisiertes Arbeiten, Kundenaufbau", weight: 1 },
  ],
  logistics: [
    { name: "Führerschein- und Staplerscheine", description: "Klassen und Nachweise laut Suchprofil", weight: 2 },
    { name: "Erfahrung in Lager oder Transport", description: "Vergleichbare Tätigkeiten", weight: 2 },
    { name: "Schicht- und Zeitflexibilität", description: "Passt zum Schichtmodell", weight: 1 },
  ],
  office: [
    { name: "Kaufmännische Ausbildung", description: "Abschluss oder gleichwertige Erfahrung", weight: 2 },
    { name: "Software-Kenntnisse", description: "Office, ERP oder Fachsoftware laut Suchprofil", weight: 1 },
    { name: "Organisation und Sorgfalt", description: "Beispiele aus dem Arbeitsalltag", weight: 2 },
  ],
};

export function criteriaTemplate(category: Category | null): T[] {
  return (category && BY_CATEGORY[category]) || GENERAL;
}
