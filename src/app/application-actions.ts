"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { processAtsTransfers } from "@/lib/ats/process";
import { findAggIssues } from "@/lib/agg";
import { getSession } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { fromStored } from "@/lib/briefing/schema";
import { parseRatings } from "@/lib/scorecard/ratings";
import { criteriaTemplate } from "@/lib/scorecard/templates";
import { MANUAL_STATUSES, type ApplicationStatus } from "@/lib/applications/status";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processDueMails } from "@/lib/mail/outbox";
import { mailConfigured } from "@/lib/mail/send";
import { isUuid } from "@/lib/vacancies/paths";

async function staffOnly() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isStaff(session.role)) redirect("/");
  return session;
}

const vacancyPage = (id: string, q: string) => `/admin/vacancies/${id}?c=${q}#kriterien`;
const applicationPage = (id: string, q: string) => `/admin/applications/${id}?s=${q}`;

// ---------- Criteria (F4) ----------

export async function addCriterion(form: FormData) {
  await staffOnly();
  const vacancyId = String(form.get("vacancyId") ?? "");
  if (!isUuid(vacancyId)) redirect("/admin");
  const name = String(form.get("name") ?? "").trim().slice(0, 150);
  const description = String(form.get("description") ?? "").trim().slice(0, 300) || null;
  const weight = Number(form.get("weight"));
  if (name.length < 3 || ![1, 2, 3].includes(weight)) redirect(vacancyPage(vacancyId, "invalid"));
  if (findAggIssues(`${name} ${description ?? ""}`).length) redirect(vacancyPage(vacancyId, "agg"));

  const supabase = await createClient();
  const { data: last } = await supabase.from("scorecard_criteria").select("position").eq("vacancy_id", vacancyId).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("scorecard_criteria").insert({ vacancy_id: vacancyId, position: (last?.[0]?.position ?? 0) + 1, name, description, weight });
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(vacancyPage(vacancyId, error ? "error" : "saved"));
}

export async function updateCriterionWeight(form: FormData) {
  await staffOnly();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const id = String(form.get("criterionId") ?? "");
  const weight = Number(form.get("weight"));
  if (!isUuid(vacancyId) || !isUuid(id) || ![1, 2, 3].includes(weight)) redirect("/admin");
  const supabase = await createClient();
  const { error } = await supabase.from("scorecard_criteria").update({ weight }).eq("id", id).eq("vacancy_id", vacancyId);
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(vacancyPage(vacancyId, error ? "error" : "saved"));
}

export async function removeCriterion(form: FormData) {
  await staffOnly();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const id = String(form.get("criterionId") ?? "");
  if (!isUuid(vacancyId) || !isUuid(id)) redirect("/admin");
  const supabase = await createClient();
  // Rated criteria stay, otherwise ratings (and the explanation of scores) would be lost.
  const { count: rated } = await supabase.from("scorecard_ratings").select("criterion_id", { count: "exact", head: true }).eq("criterion_id", id);
  if ((rated ?? 0) > 0) redirect(vacancyPage(vacancyId, "rated"));
  const { count } = await supabase.from("scorecard_criteria").delete({ count: "exact" }).eq("id", id).eq("vacancy_id", vacancyId);
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(vacancyPage(vacancyId, count ? "saved" : "error"));
}

export async function applyCriteriaTemplate(form: FormData) {
  await staffOnly();
  const vacancyId = String(form.get("vacancyId") ?? "");
  if (!isUuid(vacancyId)) redirect("/admin");
  const supabase = await createClient();
  const [{ count }, { data: b }] = await Promise.all([
    supabase.from("scorecard_criteria").select("id", { count: "exact", head: true }).eq("vacancy_id", vacancyId),
    supabase.from("vacancy_briefings").select("data").eq("vacancy_id", vacancyId).maybeSingle(),
  ]);
  if ((count ?? 0) > 0) redirect(vacancyPage(vacancyId, "exists"));
  const rows = criteriaTemplate(fromStored(b?.data).category).map((t, i) => ({ vacancy_id: vacancyId, position: i + 1, ...t }));
  const { error } = await supabase.from("scorecard_criteria").insert(rows);
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(vacancyPage(vacancyId, error ? "error" : "saved"));
}

// ---------- Ratings and status (F4/F5) ----------

export async function saveRatings(form: FormData) {
  await staffOnly();
  const applicationId = String(form.get("applicationId") ?? "");
  if (!isUuid(applicationId)) redirect("/admin");
  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("vacancy_id").eq("id", applicationId).single();
  if (!app) redirect("/admin");
  const { data: criteria } = await supabase.from("scorecard_criteria").select("id, name, description, weight").eq("vacancy_id", app.vacancy_id);
  const { ratings, missingReason } = parseRatings(form, (criteria ?? []).map((c) => ({ ...c, weight: Number(c.weight) })));

  if (ratings.length) {
    const { error } = await supabase.from("scorecard_ratings").upsert(
      ratings.map((r) => ({ application_id: applicationId, criterion_id: r.criterionId, rating: r.rating, reason: r.reason, ai_suggested: false })),
      { onConflict: "application_id,criterion_id" },
    );
    if (error) redirect(applicationPage(applicationId, "error"));
  }
  revalidatePath(`/admin/applications/${applicationId}`);
  redirect(missingReason.length ? `${applicationPage(applicationId, "missing")}&m=${missingReason.join(",")}` : applicationPage(applicationId, "rated"));
}

type Status = ApplicationStatus;

export async function setApplicationStatus(form: FormData) {
  await staffOnly();
  const applicationId = String(form.get("applicationId") ?? "");
  const status = String(form.get("status") ?? "") as Status;
  if (!isUuid(applicationId) || !MANUAL_STATUSES.includes(status)) redirect("/admin");
  const supabase = await createClient();

  // The scorecard is the product: nobody reaches the customer without a complete one.
  if (status === "shortlisted" && !(await scorecardComplete(applicationId))) redirect(applicationPage(applicationId, "incomplete"));
  const { error } = await supabase.from("applications").update({ status }).eq("id", applicationId);
  // A status change may queue a handover to the customer's ATS (0022).
  after(() => processAtsTransfers(5).catch((e) => console.error("ats transfer failed", e)));
  revalidatePath(`/admin/applications/${applicationId}`);
  redirect(applicationPage(applicationId, error ? "statusError" : "status"));
}

/** For drag-and-drop in the pipeline (F5): returns a result instead of redirecting. */
export async function moveApplication(applicationId: string, status: string): Promise<{ ok: boolean; error?: "incomplete" | "error" }> {
  await staffOnly();
  if (!isUuid(applicationId) || !MANUAL_STATUSES.includes(status as Status)) return { ok: false, error: "error" };
  const supabase = await createClient();
  if (status === "shortlisted" && !(await scorecardComplete(applicationId))) return { ok: false, error: "incomplete" };
  const { error, count } = await supabase.from("applications").update({ status: status as Status }, { count: "exact" }).eq("id", applicationId);
  // A status change may queue a handover to the customer's ATS (0022).
  after(() => processAtsTransfers(5).catch((e) => console.error("ats transfer failed", e)));
  return error || count !== 1 ? { ok: false, error: "error" } : { ok: true };
}

async function scorecardComplete(applicationId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("vacancy_id").eq("id", applicationId).single();
  if (!app) return false;
  const [{ count: all }, { count: rated }] = await Promise.all([
    supabase.from("scorecard_criteria").select("id", { count: "exact", head: true }).eq("vacancy_id", app.vacancy_id),
    supabase.from("scorecard_ratings").select("criterion_id", { count: "exact", head: true }).eq("application_id", applicationId),
  ]);
  return Boolean(all) && (rated ?? 0) >= (all ?? 0);
}

// ---------- Mails from the pipeline (F5) ----------

const STAFF_TEMPLATES = ["invite_interview", "rejection", "question"] as const;

export async function sendCandidateMail(form: FormData) {
  const session = await staffOnly();
  const applicationId = String(form.get("applicationId") ?? "");
  const template = String(form.get("template") ?? "") as (typeof STAFF_TEMPLATES)[number];
  const message = String(form.get("message") ?? "").trim().slice(0, 3000);
  if (!isUuid(applicationId) || !STAFF_TEMPLATES.includes(template)) redirect("/admin");
  if (template !== "rejection" && message.length < 3) redirect(applicationPage(applicationId, "mailNeedsMessage"));

  // Read through the staff session (RLS), write the queue with the service role.
  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("id, candidates(first_name, email), vacancies(title, employer_visible, organizations(name, candidate_tone))")
    .eq("id", applicationId)
    .single();
  if (!app) redirect("/admin");
  if (!app.candidates?.email) redirect(applicationPage(applicationId, "mailNoEmail"));

  const { error } = await createAdminClient().from("mail_outbox").insert({
    application_id: applicationId,
    to_email: app.candidates.email,
    template,
    data: {
      firstName: app.candidates.first_name,
      jobTitle: app.vacancies?.title ?? "",
      employer: app.vacancies?.employer_visible ? (app.vacancies?.organizations?.name ?? null) : null,
      message: message || null,
      senderName: session.fullName,
      tone: app.vacancies?.organizations?.candidate_tone === "du" ? "du" : "sie",
    },
  });
  if (error) redirect(applicationPage(applicationId, "error"));
  after(() => processDueMails(5).catch((e) => console.error("mail processing failed", e)));
  redirect(applicationPage(applicationId, mailConfigured() ? "mailSentNow" : "mailQueued"));
}

export async function cancelMail(form: FormData) {
  await staffOnly();
  const applicationId = String(form.get("applicationId") ?? "");
  const mailId = String(form.get("mailId") ?? "");
  if (!isUuid(applicationId) || !isUuid(mailId)) redirect("/admin");
  const supabase = await createClient();
  const { count } = await supabase
    .from("mail_outbox")
    .update({ cancelled_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", mailId)
    .is("sent_at", null);
  redirect(applicationPage(applicationId, count ? "mailCancelled" : "error"));
}
