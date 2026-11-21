import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Criterion } from "./ratings";

export type ScorecardData = {
  applicationId: string;
  candidateName: string;
  vacancyTitle: string;
  employer: string | null;
  status: string;
  score: number | null;
  criteria: (Criterion & { rating: number | null; reason: string | null; ratedAt: string | null; aiAssisted: boolean })[];
};

/** Loads a scorecard through the signed-in user's session: RLS decides (staff: all, customers: shortlist only). */
export async function loadScorecard(applicationId: string): Promise<ScorecardData | null> {
  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("id, status, score, vacancy_id, candidates(first_name, last_name), vacancies(title, organizations(name))")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app) return null;
  const [{ data: criteria }, { data: ratings }] = await Promise.all([
    supabase.from("scorecard_criteria").select("id, name, description, weight").eq("vacancy_id", app.vacancy_id).order("position"),
    supabase.from("scorecard_ratings").select("criterion_id, rating, reason, rated_at, ai_suggested").eq("application_id", applicationId),
  ]);
  return {
    applicationId: app.id,
    candidateName: `${app.candidates?.first_name ?? ""} ${app.candidates?.last_name ?? ""}`.trim(),
    vacancyTitle: app.vacancies?.title ?? "",
    employer: app.vacancies?.organizations?.name ?? null,
    status: app.status,
    score: app.score === null ? null : Number(app.score),
    criteria: (criteria ?? []).map((c) => {
      const r = ratings?.find((x) => x.criterion_id === c.id);
      return { ...c, weight: Number(c.weight), rating: r?.rating ?? null, reason: r?.reason ?? null, ratedAt: r?.rated_at ?? null, aiAssisted: Boolean(r?.ai_suggested) };
    }),
  };
}
