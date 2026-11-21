"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { fromStored, missingForSubmit, parseBriefingForm } from "@/lib/briefing/schema";
import { suggestCriteria, suggestQuestions } from "@/lib/briefing/suggestions";
import { createClient } from "@/lib/supabase/server";
import { isUuid, vacancyBase, vacancyPath } from "@/lib/vacancies/paths";

async function signedIn() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Creates a draft vacancy with an empty briefing. RLS decides which organizations the user may use. */
export async function createVacancy(formData: FormData) {
  const session = await signedIn();
  const base = vacancyBase(session.role);
  const title = String(formData.get("title") ?? "").trim().slice(0, 150);
  const organizationId = String(formData.get("organizationId") ?? "");
  if (title.length < 3 || !isUuid(organizationId)) redirect(`${base}?error=create`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vacancies")
    .insert({ organization_id: organizationId, title, created_by: session.userId })
    .select("id")
    .single();
  if (error || !data) redirect(`${base}?error=create`);
  await supabase.from("vacancy_briefings").insert({ vacancy_id: data.id, data: { v: 1, title } });
  redirect(vacancyPath(session.role, data.id));
}

/**
 * Saves the briefing. "submit" saves first and then checks completeness, so
 * nothing typed is lost when fields are missing.
 */
export async function saveBriefing(formData: FormData) {
  const session = await signedIn();
  const vacancyId = String(formData.get("vacancyId") ?? "");
  if (!isUuid(vacancyId)) redirect(vacancyBase(session.role));
  const path = vacancyPath(session.role, vacancyId);
  const briefing = parseBriefingForm(formData);
  const submit = formData.get("intent") === "submit";

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("vacancy_briefings")
    .upsert({ vacancy_id: vacancyId, data: briefing }, { onConflict: "vacancy_id", count: "exact" });
  // RLS blocks customers once the contract is signed.
  if (error || count === 0) redirect(`${path}?status=${error?.code === "42501" || count === 0 ? "locked" : "error"}`);

  revalidatePath(path);
  if (!submit) redirect(`${path}?status=saved`);

  const missing = missingForSubmit(briefing);
  if (missing.length > 0) redirect(`${path}?missing=${missing.join(",")}`);

  const { error: submitError } = await supabase
    .from("vacancy_briefings")
    .update({ submitted_at: new Date().toISOString() })
    .eq("vacancy_id", vacancyId);
  redirect(`${path}?status=${submitError ? "error" : "submitted"}`);
}

/** Staff only: turns the briefing suggestions into knockout questions and scorecard criteria, if none exist yet. */
export async function applySuggestions(formData: FormData) {
  const session = await signedIn();
  if (!isStaff(session.role)) redirect("/");
  const vacancyId = String(formData.get("vacancyId") ?? "");
  if (!isUuid(vacancyId)) redirect("/admin");
  const path = vacancyPath(session.role, vacancyId);

  const supabase = await createClient();
  const [{ data: briefingRow }, { count: qCount }, { count: cCount }] = await Promise.all([
    supabase.from("vacancy_briefings").select("data").eq("vacancy_id", vacancyId).single(),
    supabase.from("screening_questions").select("id", { count: "exact", head: true }).eq("vacancy_id", vacancyId),
    supabase.from("scorecard_criteria").select("id", { count: "exact", head: true }).eq("vacancy_id", vacancyId),
  ]);
  if ((qCount ?? 0) > 0 || (cCount ?? 0) > 0) redirect(`${path}?status=exists`);

  const briefing = fromStored(briefingRow?.data);
  const questions = suggestQuestions(briefing).map((q, i) => ({
    vacancy_id: vacancyId, position: i + 1, question: q.question, kind: q.kind, knockout_rule: q.knockoutRule,
  }));
  const criteria = suggestCriteria(briefing).map((c, i) => ({
    vacancy_id: vacancyId, position: i + 1, name: c.name, description: c.description, weight: c.weight,
  }));

  const [qRes, cRes] = await Promise.all([
    questions.length ? supabase.from("screening_questions").insert(questions) : Promise.resolve({ error: null }),
    criteria.length ? supabase.from("scorecard_criteria").insert(criteria) : Promise.resolve({ error: null }),
  ]);
  revalidatePath(path);
  redirect(`${path}?status=${qRes.error || cRes.error ? "error" : "applied"}`);
}
