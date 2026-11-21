import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toRatingMap, toRule, type QuestionKind, type ScreeningQuestion } from "./rules";

/** Questions of a vacancy for the public application form (server-side, service role). */
export async function questionsForVacancy(vacancyId: string): Promise<ScreeningQuestion[]> {
  const { data, error } = await createAdminClient()
    .from("screening_questions")
    .select("id, position, question, kind, options, knockout_rule, required, criterion_id, rating_map")
    .eq("vacancy_id", vacancyId)
    .order("position");
  if (error) throw new Error(`questions query failed: ${error.message}`);
  return (data ?? []).map((q) => ({
    id: q.id,
    position: q.position,
    question: q.question,
    kind: q.kind as QuestionKind,
    options: Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === "string") : null,
    knockoutRule: toRule(q.kind as QuestionKind, q.knockout_rule),
    required: q.required,
    criterionId: q.criterion_id,
    ratingMap: toRatingMap(q.rating_map),
  }));
}
