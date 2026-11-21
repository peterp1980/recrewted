import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { VacancyListItem } from "@/components/VacancyList";

/** Vacancies visible to the signed-in user (RLS decides), newest first. */
export async function listVacancies(): Promise<VacancyListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vacancies")
    .select("id, title, status, created_at, organizations(name), vacancy_briefings(submitted_at)")
    .order("created_at", { ascending: false });
  return (data ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    status: v.status,
    organization: v.organizations?.name,
    submitted: Boolean(v.vacancy_briefings?.submitted_at),
  }));
}
