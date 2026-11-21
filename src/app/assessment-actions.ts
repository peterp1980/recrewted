"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { findAggIssues } from "@/lib/agg";
import { parseQuestionForm } from "@/lib/assessments/model";
import { createAttempt, queueInvite, testUrl } from "@/lib/assessments/server";
import { isStaff } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { mailConfigured } from "@/lib/mail/send";
import { processDueMails } from "@/lib/mail/outbox";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";

// Recruiter actions: build tests per vacancy, send them, score open answers.
// Writes go through the staff session, so RLS checks them as well.

async function staff() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isStaff(session.role)) redirect("/");
  return session;
}
const vacancyPage = (id: string, q: string) => `/admin/vacancies/${id}?t=${q}#assessment`;
const applicationPage = (id: string, q: string, extra = "") => `/admin/applications/${id}?x=${q}${extra}#assessment`;

export async function createAssessment(form: FormData) {
  const session = await staff();
  const vacancyId = String(form.get("vacancyId") ?? "");
  if (!isUuid(vacancyId)) redirect("/admin");
  const title = String(form.get("title") ?? "").trim().slice(0, 150);
  const intro = String(form.get("intro") ?? "").trim().slice(0, 3000);
  const stage = form.get("stage") === "apply" ? "apply" : "invite";
  const limitRaw = String(form.get("timeLimit") ?? "").trim();
  const limit = limitRaw ? Number(limitRaw) : null;
  if (title.length < 2 || (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 600))) redirect(vacancyPage(vacancyId, "invalid"));
  if (findAggIssues(`${title}\n${intro}`).length) redirect(vacancyPage(vacancyId, "agg"));
  const supabase = await createClient();
  const { error } = await supabase.from("assessments").insert({ vacancy_id: vacancyId, title, intro, stage, time_limit_minutes: limit, created_by: session.userId });
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(vacancyPage(vacancyId, error?.code === "23505" ? "conflict" : error ? "error" : "saved"));
}

export async function archiveAssessment(form: FormData) {
  await staff();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const id = String(form.get("assessmentId") ?? "");
  if (!isUuid(vacancyId) || !isUuid(id)) redirect("/admin");
  const supabase = await createClient();
  const { error } = await supabase.from("assessments").update({ active: false }).eq("id", id).eq("vacancy_id", vacancyId);
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(vacancyPage(vacancyId, error ? "error" : "saved"));
}

export async function addAssessmentQuestion(form: FormData) {
  await staff();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const id = String(form.get("assessmentId") ?? "");
  if (!isUuid(vacancyId) || !isUuid(id)) redirect("/admin");
  const parsed = parseQuestionForm(form);
  if (!parsed.ok) redirect(vacancyPage(vacancyId, "invalid"));
  const q = parsed.value;
  if (findAggIssues(`${q.prompt}\n${q.caseText}\n${q.options.join("\n")}`).length) redirect(vacancyPage(vacancyId, "agg"));
  const supabase = await createClient();
  const { data: last } = await supabase.from("assessment_questions").select("position").eq("assessment_id", id).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("assessment_questions").insert({
    assessment_id: id,
    position: (last?.position ?? 0) + 1,
    kind: q.kind,
    prompt: q.prompt,
    case_text: q.caseText,
    options: q.options.length ? q.options : null,
    correct: q.correct,
    points: q.points,
  });
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(vacancyPage(vacancyId, error ? "error" : "saved"));
}

export async function removeAssessmentQuestion(form: FormData) {
  await staff();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const id = String(form.get("questionId") ?? "");
  if (!isUuid(vacancyId) || !isUuid(id)) redirect("/admin");
  const supabase = await createClient();
  // Answered questions stay, otherwise candidates' answers would be lost.
  const { count } = await supabase.from("assessment_answers").select("id", { count: "exact", head: true }).eq("question_id", id);
  if ((count ?? 0) > 0) redirect(vacancyPage(vacancyId, "answered"));
  const { error } = await supabase.from("assessment_questions").delete().eq("id", id);
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(vacancyPage(vacancyId, error ? "error" : "saved"));
}

export async function moveAssessmentQuestion(form: FormData) {
  await staff();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const id = String(form.get("questionId") ?? "");
  if (!isUuid(vacancyId) || !isUuid(id)) redirect("/admin");
  const supabase = await createClient();
  const { data: q } = await supabase.from("assessment_questions").select("assessment_id, position").eq("id", id).single();
  if (!q) redirect(vacancyPage(vacancyId, "error"));
  const { data: prev } = await supabase.from("assessment_questions").select("id, position").eq("assessment_id", q.assessment_id).lt("position", q.position).order("position", { ascending: false }).limit(1).maybeSingle();
  if (prev) {
    // Swap via a temporary position; (assessment_id, position) is unique.
    await supabase.from("assessment_questions").update({ position: -1 }).eq("id", id);
    await supabase.from("assessment_questions").update({ position: q.position }).eq("id", prev.id);
    await supabase.from("assessment_questions").update({ position: prev.position }).eq("id", id);
  }
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(vacancyPage(vacancyId, "saved"));
}

/** Sends a test to a candidate: personal link by e-mail. */
export async function sendAssessment(form: FormData) {
  const session = await staff();
  const applicationId = String(form.get("applicationId") ?? "");
  const assessmentId = String(form.get("assessmentId") ?? "");
  if (!isUuid(applicationId) || !isUuid(assessmentId)) redirect("/admin");
  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("vacancy_id, candidates(email)").eq("id", applicationId).single();
  const { data: test } = await supabase.from("assessments").select("vacancy_id").eq("id", assessmentId).single();
  if (!app || !test || app.vacancy_id !== test.vacancy_id) redirect(applicationPage(applicationId, "error"));
  if (!app.candidates?.email) redirect(applicationPage(applicationId, "noEmail"));
  const created = await createAttempt(assessmentId, applicationId, session.userId);
  if ("error" in created) redirect(applicationPage(applicationId, created.error === "exists" ? "already" : "error"));
  const queued = await queueInvite(applicationId, created.token);
  if (!queued) redirect(applicationPage(applicationId, "error"));
  after(() => processDueMails(5).catch((e) => console.error("mail processing failed", e)));
  revalidatePath(`/admin/applications/${applicationId}`);
  // Without a mail provider the recruiter gets the link once, to send it by hand.
  redirect(mailConfigured() ? applicationPage(applicationId, "sent") : applicationPage(applicationId, "queued", `&link=${encodeURIComponent(testUrl(created.token))}`));
}

/** A person scores an open answer (text, case, upload). Totals are kept on the attempt. */
export async function scoreAssessmentAnswer(form: FormData) {
  const session = await staff();
  const applicationId = String(form.get("applicationId") ?? "");
  const answerId = String(form.get("answerId") ?? "");
  if (!isUuid(applicationId) || !isUuid(answerId)) redirect("/admin");
  const points = Number(String(form.get("points") ?? "").replace(",", "."));
  const note = String(form.get("note") ?? "").trim().slice(0, 1000) || null;
  const supabase = await createClient();
  const { data: ans } = await supabase.from("assessment_answers").select("attempt_id, assessment_questions(points, kind)").eq("id", answerId).single();
  const max = Number(ans?.assessment_questions?.points ?? 0);
  if (!ans || !Number.isFinite(points) || points < 0 || points > max) redirect(applicationPage(applicationId, "invalid"));
  const { error } = await supabase.from("assessment_answers").update({ manual_points: Math.round(points * 10) / 10, reviewer_note: note }).eq("id", answerId);
  if (error) redirect(applicationPage(applicationId, "error"));
  const { data: all } = await supabase.from("assessment_answers").select("manual_points").eq("attempt_id", ans.attempt_id);
  const manual = (all ?? []).reduce((s, r) => s + (r.manual_points === null ? 0 : Number(r.manual_points)), 0);
  await supabase.from("assessment_attempts").update({ manual_points: manual, reviewed_at: new Date().toISOString(), reviewed_by: session.userId }).eq("id", ans.attempt_id);
  revalidatePath(`/admin/applications/${applicationId}`);
  redirect(applicationPage(applicationId, "scored"));
}
