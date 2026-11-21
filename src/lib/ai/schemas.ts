import { z } from "zod";

// Output formats. Every suggestion carries its reasons so a person can check it (explainability).

export const AdDraftSchema = z.object({
  title: z.string().describe("Stellentitel mit (m/w/d)"),
  body: z.string().describe("Anzeigentext, Absätze durch Leerzeilen getrennt"),
  notes: z.array(z.string()).describe("Hinweise für den Recruiter: was fehlte im Briefing, was sollte geprüft werden"),
});
export type AdDraftOut = z.infer<typeof AdDraftSchema>;

export const CriteriaSchema = z.object({
  criteria: z.array(z.object({
    name: z.string(),
    description: z.string().describe("Woran man die Erfüllung erkennt, beobachtbar formuliert"),
    weight: z.number().int().describe("1 = nice to have, 2 = wichtig, 3 = entscheidend"),
    source: z.string().describe("Stelle im Briefing, aus der das Kriterium folgt"),
  })),
  questions: z.array(z.object({
    question: z.string().describe("Ja/Nein-Frage an Bewerber, sachlich und stellenbezogen"),
    knockout: z.boolean().describe("true nur bei zwingender, gesetzlich oder fachlich notwendiger Voraussetzung"),
    reason: z.string().describe("Warum die Frage für die Stelle nötig ist"),
  })),
  warnings: z.array(z.string()).describe("Formulierungen im Briefing, die rechtlich heikel sein könnten (AGG)"),
});
export type CriteriaOut = z.infer<typeof CriteriaSchema>;

export const GuideSchema = z.object({
  sections: z.array(z.object({
    criterion: z.string(),
    questions: z.array(z.string()).describe("2–3 offene, verhaltensbezogene Fragen"),
    goodAnswer: z.string().describe("Woran man eine starke Antwort erkennt"),
  })),
  doNotAsk: z.array(z.string()).describe("Fragen, die im Gespräch unzulässig sind, passend zur Stelle"),
});
export type GuideOut = z.infer<typeof GuideSchema>;

export const RatingSchema = z.object({
  ratings: z.array(z.object({
    criterionId: z.string(),
    rating: z.number().int().nullable().describe("1–5, oder null wenn die Unterlagen keinen Beleg enthalten"),
    evidence: z.array(z.object({
      source: z.string().describe("\"Lebenslauf\" oder die genaue Frage aus dem Fragebogen"),
      quote: z.string().describe("Wörtliches Zitat, unverändert"),
    })),
    reasoning: z.string().describe("Ein bis zwei Sätze, warum diese Stufe"),
  })),
});
export type RatingOut = z.infer<typeof RatingSchema>;
