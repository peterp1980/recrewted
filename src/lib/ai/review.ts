import { screenItems, verifyEvidence } from "./legal";
import type { CriteriaOut, RatingOut } from "./schemas";

/** Screens a criteria suggestion: items with AGG or proxy issues are never offered. */
export function screenCriteria(out: CriteriaOut) {
  return {
    criteria: screenItems(out.criteria, (x) => `${x.name} ${x.description}`),
    questions: screenItems(out.questions, (x) => x.question),
  };
}

/** What the recruiter sees: only known criteria, evidence checked, unsupported ratings removed. */
export function checkedRatings(out: RatingOut, criteriaIds: string[], answersText: string) {
  return out.ratings.filter((r) => criteriaIds.includes(r.criterionId)).map((r) => verifyEvidence(r, answersText));
}

/** Questionnaire answers as plain text, the same way for the model and for the evidence check. */
export function answersAsText(answers: { answer: unknown; screening_questions: { question: string; position: number } | null }[]): string {
  return [...answers]
    .sort((a, b) => (a.screening_questions?.position ?? 0) - (b.screening_questions?.position ?? 0))
    .map((a) => `${a.screening_questions?.question ?? ""} ${a.answer === true ? "Ja" : a.answer === false ? "Nein" : String(a.answer)}`)
    .join("\n");
}
