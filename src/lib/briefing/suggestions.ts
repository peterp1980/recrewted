import { findAggIssues } from "@/lib/agg";
import type { Briefing } from "./schema";

// Rule-based suggestions from the briefing (F13). No AI: a recruiter reviews
// and applies them (F3/F4). Items that look discriminatory are never suggested.

export type SuggestedQuestion = {
  question: string;
  kind: "yes_no";
  /** The answer that excludes the applicant. */
  knockoutRule: { exclude: "no" };
};

export type SuggestedCriterion = { name: string; description: string; weight: number };

const MAX_QUESTIONS = 6;
const MAX_CRITERIA = 8;

const clean = (items: string[]) => items.filter((i) => findAggIssues(i).length === 0);

export function suggestQuestions(b: Briefing): SuggestedQuestion[] {
  const q: SuggestedQuestion[] = clean(b.mustHave).map((item) => ({
    question: `Bringen Sie Folgendes mit: ${item}?`,
    kind: "yes_no",
    knockoutRule: { exclude: "no" },
  }));
  if (b.remote !== "remote" && b.location) {
    const where = b.remote === "hybrid" ? `regelmäßig in ${b.location}` : `in ${b.location}`;
    q.push({ question: `Können Sie ${where} arbeiten?`, kind: "yes_no", knockoutRule: { exclude: "no" } });
  }
  return q.slice(0, MAX_QUESTIONS);
}

export function suggestCriteria(b: Briefing): SuggestedCriterion[] {
  const must = clean(b.mustHave).map((name) => ({ name, description: "Muss-Kriterium aus dem Briefing", weight: 2 }));
  const nice = clean(b.niceToHave).map((name) => ({ name, description: "Kann-Kriterium aus dem Briefing", weight: 1 }));
  const general = [{ name: "Motivation und Passung zur Aufgabe", description: "Warum diese Stelle, Bezug zu den Aufgaben", weight: 1 }];
  return [...must, ...nice].slice(0, MAX_CRITERIA - general.length).concat(general);
}

/** Items the customer entered that were left out because they look discriminatory. */
export function flaggedItems(b: Briefing): string[] {
  return [...b.mustHave, ...b.niceToHave, ...b.tasks, ...b.benefits].filter((i) => findAggIssues(i).length > 0);
}
