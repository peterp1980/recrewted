"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkAd, type Channel } from "@/lib/ads/generator";
import { findAggIssues } from "@/lib/agg";
import { answersAsText, screenCriteria } from "@/lib/ai/review";
import { aiAllowed, decideRecommendation, runStructured } from "@/lib/ai/run";
import { AdDraftSchema, CriteriaSchema, GuideSchema, RatingSchema } from "@/lib/ai/schemas";
import { getSession } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { fromStored } from "@/lib/briefing/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";
import type Anthropic from "@anthropic-ai/sdk";

// AI assistance for recruiters. Every function only suggests; the person applies, changes or
// rejects, and that decision is written to the same log entry (decideRecommendation).

async function staff() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!isStaff(s.role)) redirect("/");
  return s;
}
const vacancyPage = (id: string, q: string, anchor: string) => `/admin/vacancies/${id}?ki=${q}#${anchor}`;
const errorCode = (e: "disabled" | "refused" | "failed") => (e === "disabled" ? "off" : e === "refused" ? "refused" : "failed");

/** Briefing without contact details: the model needs the job, not who to call. */
async function vacancyContext(vacancyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vacancies")
    .select("id, title, organization_id, employer_visible, organizations(name, candidate_tone), vacancy_briefings(data)")
    .eq("id", vacancyId)
    .single();
  if (!data) return null;
  const b = fromStored(data.vacancy_briefings?.data);
  const { contactName: _n, contactEmail: _e, contactPhone: _p, ...briefing } = b;
  void _n; void _e; void _p;
  return {
    data,
    briefing,
    employer: data.employer_visible ? (data.organizations?.name ?? null) : null,
    tone: data.organizations?.candidate_tone === "du" ? "du" : "sie",
    raw: b,
  };
}

// ---------------------------------------------------------------- ads

export async function aiAdDraft(form: FormData) {
  const session = await staff();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const channel: Channel = form.get("channel") === "social" ? "social" : "portal";
  if (!isUuid(vacancyId)) redirect("/admin");
  const ctx = await vacancyContext(vacancyId);
  if (!ctx) redirect("/admin");
  if (!(await aiAllowed(ctx.data.organization_id, "assist"))) redirect(vacancyPage(vacancyId, "off", "anzeigen"));

  const result = await runStructured(
    { kind: "job_ad_text", organizationId: ctx.data.organization_id, vacancyId, requestedBy: session.userId, inputRef: { channel, briefingFields: Object.keys(ctx.briefing).length } },
    AdDraftSchema,
    [{ type: "text", text: `Kanal: ${channel}\nAnrede: ${ctx.tone === "du" ? "du" : "Sie"}\nArbeitgeber: ${ctx.employer ?? "nicht genannt (vertraulich)"}\n\nBriefing (JSON):\n${JSON.stringify(ctx.briefing, null, 2)}` }],
  );
  if (!result.ok) redirect(vacancyPage(vacancyId, errorCode(result.error), "anzeigen"));

  const supabase = await createClient();
  const { data: last } = await supabase.from("job_ads").select("version").eq("vacancy_id", vacancyId).eq("channel", channel).order("version", { ascending: false }).limit(1);
  const { error } = await supabase.from("job_ads").insert({
    vacancy_id: vacancyId, channel, template_key: "ki", version: (last?.[0]?.version ?? 0) + 1,
    title: result.output.title.slice(0, 200), body: result.output.body.slice(0, 10000), status: "draft", ai_recommendation_id: result.id,
  });
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  // The usual checks (m/w/d, salary, AGG, length) run on the draft like on any other version.
  const issues = checkAd(result.output, channel, ctx.raw);
  redirect(vacancyPage(vacancyId, error ? "failed" : issues.length ? "adChecks" : "adDraft", "anzeigen"));
}

// ---------------------------------------------------------------- criteria and questions

export async function aiCriteria(form: FormData) {
  const session = await staff();
  const vacancyId = String(form.get("vacancyId") ?? "");
  if (!isUuid(vacancyId)) redirect("/admin");
  const ctx = await vacancyContext(vacancyId);
  if (!ctx) redirect("/admin");
  if (!(await aiAllowed(ctx.data.organization_id, "assist"))) redirect(vacancyPage(vacancyId, "off", "ki-kriterien"));
  const result = await runStructured(
    { kind: "criteria_suggestion", organizationId: ctx.data.organization_id, vacancyId, requestedBy: session.userId, inputRef: { briefingFields: Object.keys(ctx.briefing).length } },
    CriteriaSchema,
    [{ type: "text", text: `Briefing (JSON):\n${JSON.stringify(ctx.briefing, null, 2)}` }],
  );
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(vacancyPage(vacancyId, result.ok ? "criteria" : errorCode(result.error), "ki-kriterien"));
}

export async function aiCriteriaApply(form: FormData) {
  const session = await staff();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const recId = String(form.get("recId") ?? "");
  if (!isUuid(vacancyId) || !isUuid(recId)) redirect("/admin");
  const admin = createAdminClient();
  const { data: rec } = await admin.from("ai_recommendations").select("output, status, vacancy_id").eq("id", recId).single();
  if (!rec || rec.vacancy_id !== vacancyId || rec.status !== "suggested") redirect(vacancyPage(vacancyId, "decided", "ki-kriterien"));
  const out = CriteriaSchema.parse(rec.output);
  const screened = screenCriteria(out);
  if (form.get("decision") === "reject") {
    await decideRecommendation(recId, "rejected", null, session.userId);
    revalidatePath(`/admin/vacancies/${vacancyId}`);
    redirect(vacancyPage(vacancyId, "rejected", "ki-kriterien"));
  }

  const pickedC = screened.criteria.ok.filter((_, i) => form.get(`c_${i}`) === "on");
  const pickedQ = screened.questions.ok.map((q, i) => ({ q, use: form.get(`q_${i}`) === "on", knockout: form.get(`k_${i}`) === "on" })).filter((x) => x.use);
  const supabase = await createClient();
  let failed = false;
  if (pickedC.length) {
    const { data: lastC } = await supabase.from("scorecard_criteria").select("position").eq("vacancy_id", vacancyId).order("position", { ascending: false }).limit(1);
    const startC = (lastC?.[0]?.position ?? 0) + 1;
    const { error } = await supabase.from("scorecard_criteria").insert(
      pickedC.map((c, i) => ({ vacancy_id: vacancyId, name: c.name.slice(0, 150), description: c.description.slice(0, 500), weight: Math.min(3, Math.max(1, Math.round(c.weight))), position: startC + i })),
    );
    failed ||= Boolean(error);
  }
  if (pickedQ.length) {
    const { data: last } = await supabase.from("screening_questions").select("position").eq("vacancy_id", vacancyId).order("position", { ascending: false }).limit(1);
    const start = (last?.[0]?.position ?? 0) + 1;
    const rows = pickedQ.filter((x) => !findAggIssues(x.q.question).length).map((x, i) => ({
      vacancy_id: vacancyId, position: start + i, question: x.q.question.slice(0, 300), kind: "yes_no",
      // The person decides whether "no" excludes; the AI's own knockout flag is only a hint.
      knockout_rule: x.knockout ? { exclude: "no" } : null, required: x.knockout, options: null,
    }));
    if (rows.length) failed ||= Boolean((await supabase.from("screening_questions").insert(rows)).error);
  }
  const total = screened.criteria.ok.length + screened.questions.ok.length;
  const taken = pickedC.length + pickedQ.length;
  const changedKnockout = pickedQ.some((x) => x.knockout !== x.q.knockout);
  await decideRecommendation(
    recId,
    taken === 0 ? "rejected" : taken === total && !changedKnockout && !screened.criteria.dropped.length && !screened.questions.dropped.length ? "accepted" : "modified",
    { criteria: pickedC, questions: pickedQ.map((x) => ({ question: x.q.question, knockout: x.knockout })) },
    session.userId,
  );
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(vacancyPage(vacancyId, failed ? "failed" : "applied", "ki-kriterien"));
}

// ---------------------------------------------------------------- interview guide

export async function aiGuide(form: FormData) {
  const session = await staff();
  const vacancyId = String(form.get("vacancyId") ?? "");
  if (!isUuid(vacancyId)) redirect("/admin");
  const ctx = await vacancyContext(vacancyId);
  if (!ctx) redirect("/admin");
  if (!(await aiAllowed(ctx.data.organization_id, "assist"))) redirect(vacancyPage(vacancyId, "off", "ki-leitfaden"));
  const supabase = await createClient();
  const { data: criteria } = await supabase.from("scorecard_criteria").select("name, description, weight").eq("vacancy_id", vacancyId).order("position");
  if (!criteria?.length) redirect(vacancyPage(vacancyId, "noCriteria", "ki-leitfaden"));
  const result = await runStructured(
    { kind: "interview_guide", organizationId: ctx.data.organization_id, vacancyId, requestedBy: session.userId, inputRef: { criteria: criteria.length } },
    GuideSchema,
    [{ type: "text", text: `Stelle: ${ctx.data.title}\nAnrede im Gespräch: ${ctx.tone === "du" ? "du" : "Sie"}\n\nKriterien (JSON):\n${JSON.stringify(criteria, null, 2)}` }],
    { effort: "low" },
  );
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(vacancyPage(vacancyId, result.ok ? "guide" : errorCode(result.error), "ki-leitfaden"));
}

export async function aiDecide(form: FormData) {
  const session = await staff();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const recId = String(form.get("recId") ?? "");
  const decision = form.get("decision") === "accept" ? "accepted" : "rejected";
  const anchor = String(form.get("anchor") ?? "ki-leitfaden").replace(/[^a-z-]/g, "");
  if (!isUuid(vacancyId) || !isUuid(recId)) redirect("/admin");
  const { data: rec } = await createAdminClient().from("ai_recommendations").select("output, vacancy_id").eq("id", recId).single();
  if (rec?.vacancy_id !== vacancyId) redirect("/admin");
  await decideRecommendation(recId, decision, decision === "accepted" ? rec.output : null, session.userId);
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(vacancyPage(vacancyId, decision, anchor));
}

// ---------------------------------------------------------------- rating suggestion (high-risk)

const applicationPage = (id: string, q: string) => `/admin/applications/${id}?ki=${q}#bewertung`;
const CV_DOC: Record<string, "application/pdf"> = { pdf: "application/pdf" };
const CV_IMG: Record<string, "image/png" | "image/jpeg"> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

export async function aiRating(form: FormData) {
  const session = await staff();
  const applicationId = String(form.get("applicationId") ?? "");
  if (!isUuid(applicationId)) redirect("/admin");
  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("id, vacancy_id, cv_storage_path, vacancies(title, organization_id)")
    .eq("id", applicationId)
    .single();
  if (!app?.vacancies) redirect("/admin");
  if (!(await aiAllowed(app.vacancies.organization_id, "scoring"))) redirect(applicationPage(applicationId, "off"));

  const [{ data: criteria }, { data: answers }] = await Promise.all([
    supabase.from("scorecard_criteria").select("id, name, description").eq("vacancy_id", app.vacancy_id).order("position"),
    supabase.from("screening_answers").select("answer, screening_questions(question, position)").eq("application_id", applicationId),
  ]);
  if (!criteria?.length) redirect(applicationPage(applicationId, "noCriteria"));
  const answersText = answersAsText(answers ?? []);

  // No name, contact data or attribution: only the documents that concern the job.
  const content: Anthropic.ContentBlockParam[] = [];
  let cvKind: "pdf" | "image" | "none" | "unsupported" = "none";
  if (app.cv_storage_path) {
    const ext = app.cv_storage_path.split(".").pop()?.toLowerCase() ?? "";
    const dl = await createAdminClient().storage.from("cvs").download(app.cv_storage_path);
    if (dl.data && (CV_DOC[ext] || CV_IMG[ext])) {
      const b64 = Buffer.from(await dl.data.arrayBuffer()).toString("base64");
      content.push(CV_DOC[ext] ? { type: "document", source: { type: "base64", media_type: CV_DOC[ext], data: b64 }, title: "Lebenslauf" } : { type: "image", source: { type: "base64", media_type: CV_IMG[ext], data: b64 } });
      cvKind = CV_DOC[ext] ? "pdf" : "image";
    } else cvKind = "unsupported";
  }
  content.push({
    type: "text",
    text: `Stelle: ${app.vacancies.title}\n\nKriterien (JSON, criterionId unverändert übernehmen):\n${JSON.stringify(criteria.map((c) => ({ criterionId: c.id, name: c.name, description: c.description })), null, 2)}\n\nAntworten im Fragebogen:\n${answersText || "(keine)"}\n\n${cvKind === "none" ? "Kein Lebenslauf vorhanden." : cvKind === "unsupported" ? "Der Lebenslauf liegt in einem Format vor, das nicht übermittelt wurde (z. B. Word); bewerte nur anhand des Fragebogens." : "Der Lebenslauf ist beigefügt."}`,
  });

  const result = await runStructured(
    { kind: "scorecard_rating", organizationId: app.vacancies.organization_id, vacancyId: app.vacancy_id, applicationId, requestedBy: session.userId, inputRef: { criteria: criteria.length, answers: answers?.length ?? 0, cv: cvKind } },
    RatingSchema,
    content,
    { effort: "high" },
  );
  revalidatePath(`/admin/applications/${applicationId}`);
  redirect(applicationPage(applicationId, result.ok ? "rating" : errorCode(result.error)));
}

export async function aiRatingReject(form: FormData) {
  const session = await staff();
  const applicationId = String(form.get("applicationId") ?? "");
  const recId = String(form.get("recId") ?? "");
  if (!isUuid(applicationId) || !isUuid(recId)) redirect("/admin");
  const { data: rec } = await createAdminClient().from("ai_recommendations").select("application_id").eq("id", recId).single();
  if (rec?.application_id !== applicationId) redirect("/admin");
  await decideRecommendation(recId, "rejected", null, session.userId);
  revalidatePath(`/admin/applications/${applicationId}`);
  redirect(applicationPage(applicationId, "rejected"));
}

/** Customer switches, staff only (the customer's consent to rating suggestions is part of the contract). */
export async function setAiSwitches(form: FormData) {
  const session = await staff();
  const orgId = String(form.get("organizationId") ?? "");
  if (!isUuid(orgId)) redirect("/admin");
  const assist = form.get("aiAssist") === "on";
  const scoring = assist && form.get("aiScoring") === "on";
  const { error } = await (await createClient()).from("organizations").update({ ai_assist: assist, ai_scoring: scoring }).eq("id", orgId);
  if (!error) await createAdminClient().from("audit_log").insert({ actor: session.userId, action: "ai_switches", table_name: "organizations", record_id: orgId, details: { ai_assist: assist, ai_scoring: scoring } });
  revalidatePath(`/admin/organizations/${orgId}`);
  redirect(`/admin/organizations/${orgId}?ki=${error ? "error" : "saved"}#ki`);
}
