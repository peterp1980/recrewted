"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { fromStored, missingForSubmit, parseBriefingForm } from "@/lib/briefing/schema";
import { suggestCriteria, suggestQuestions } from "@/lib/briefing/suggestions";
import { findAggIssues } from "@/lib/agg";
import { parseQuestionForm } from "@/lib/screening/rules";
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

/** Staff only: adds a knockout question (F3). RLS also restricts writes to staff. */
export async function addQuestion(formData: FormData) {
  const session = await signedIn();
  if (!isStaff(session.role)) redirect("/");
  const vacancyId = String(formData.get("vacancyId") ?? "");
  if (!isUuid(vacancyId)) redirect("/admin");
  const path = vacancyPath(session.role, vacancyId);
  const q = parseQuestionForm(formData);
  if (!q) redirect(`${path}?q=invalid#fragen`);
  if (findAggIssues([q.question, ...(q.options ?? [])].join(" ")).length) redirect(`${path}?q=agg#fragen`);

  const supabase = await createClient();
  const { data: last } = await supabase.from("screening_questions").select("position").eq("vacancy_id", vacancyId).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("screening_questions").insert({
    vacancy_id: vacancyId, position: (last?.[0]?.position ?? 0) + 1, question: q.question, kind: q.kind, options: q.options, knockout_rule: q.knockoutRule,
    required: q.required, criterion_id: q.criterionId, rating_map: q.ratingMap,
  });
  revalidatePath(path);
  redirect(`${path}?q=${error ? "error" : "saved"}#fragen`);
}

export async function removeQuestion(formData: FormData) {
  const session = await signedIn();
  if (!isStaff(session.role)) redirect("/");
  const vacancyId = String(formData.get("vacancyId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  if (!isUuid(vacancyId) || !isUuid(questionId)) redirect("/admin");
  const path = vacancyPath(session.role, vacancyId);
  // Deleting is admin-only in RLS; recruiters get an error message.
  const supabase = await createClient();
  // Answered questions stay: deleting would also delete applicants' answers.
  const { count: answered } = await supabase.from("screening_answers").select("question_id", { count: "exact", head: true }).eq("question_id", questionId);
  if ((answered ?? 0) > 0) redirect(`${path}?q=answered#fragen`);
  const { count } = await supabase.from("screening_questions").delete({ count: "exact" }).eq("id", questionId).eq("vacancy_id", vacancyId);
  revalidatePath(path);
  redirect(`${path}?q=${count ? "removed" : "error"}#fragen`);
}

const VACANCY_STATUSES = ["draft", "contract_pending", "active", "paused", "filled", "closed"] as const;
const PRICING = ["fixed_starter", "fixed_pro", "fixed_enterprise", "service_fee_media_passthrough", "service_fee_customer_media", "success_fee", "hybrid", "subscription", "self_service_platform", "self_service_per_candidate", "license"] as const;

/** Staff only: status (publication), openings, pricing (F14 cost), confidential search. */
export async function updateVacancySettings(formData: FormData) {
  const session = await signedIn();
  if (!isStaff(session.role)) redirect("/");
  const vacancyId = String(formData.get("vacancyId") ?? "");
  if (!isUuid(vacancyId)) redirect("/admin");
  const path = vacancyPath(session.role, vacancyId);
  const status = String(formData.get("status") ?? "");
  const pricing = String(formData.get("pricingModel") ?? "");
  const openings = Number(formData.get("openings"));
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").replace(/\./g, "").replace(",", ".").trim();
    return v === "" ? null : Number(v);
  };
  const price = num("price");
  const markup = num("markup") ?? 0;
  if (
    !(VACANCY_STATUSES as readonly string[]).includes(status) ||
    !Number.isInteger(openings) || openings < 1 || openings > 100 ||
    (price !== null && (!Number.isFinite(price) || price < 0)) || !Number.isFinite(markup) || markup < 0 || markup > 500
  ) redirect(`${path}?status=error#einstellungen`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("vacancies")
    .update({
      status: status as (typeof VACANCY_STATUSES)[number],
      openings,
      pricing_model: (PRICING as readonly string[]).includes(pricing) ? (pricing as (typeof PRICING)[number]) : null,
      price_eur: price,
      media_markup_pct: markup,
      employer_visible: formData.get("employerVisible") === "on",
    })
    .eq("id", vacancyId);
  revalidatePath(path);
  if (error?.code === "23514") redirect(`${path}?status=salaryMissing#einstellungen`);
  redirect(`${path}?status=${error ? "error" : "settingsSaved"}#einstellungen`);
}

/** Customer feedback on a shortlisted candidate (F6/F14). RLS + trigger enforce shortlist and reasons. */
export async function giveFeedback(formData: FormData) {
  const session = await signedIn();
  const applicationId = String(formData.get("applicationId") ?? "");
  const verdict = String(formData.get("verdict") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500) || null;
  if (!isUuid(applicationId) || !["fit", "no_fit", "interview", "hired", "rejected"].includes(verdict)) redirect("/portal");
  let path = `/portal/applications/${applicationId}`;
  // Feedback from the comparison view returns there.
  if (formData.get("return") === "compare") {
    const { data } = await (await createClient()).from("applications").select("vacancy_id").eq("id", applicationId).maybeSingle();
    if (data) path = `/portal/vacancies/${data.vacancy_id}/vergleich`;
  }
  if ((verdict === "no_fit" || verdict === "rejected") && !reason) redirect(`${path}?f=reason`);
  const supabase = await createClient();
  const { error } = await supabase.from("customer_feedback").insert({
    application_id: applicationId,
    verdict: verdict as "fit" | "no_fit" | "interview" | "hired" | "rejected",
    reason,
    created_by: session.userId,
  });
  revalidatePath(path);
  redirect(`${path}?f=${error ? (error.message.includes("reason_required") ? "reason" : "error") : "saved"}`);
}
