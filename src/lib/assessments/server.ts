import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";
import { autoPoints, LINK_DAYS, toQuestion, type Answer, type Question } from "./model";

// Candidate links carry a random token; only its SHA-256 hash is stored, so a database leak reveals no working links.

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const testUrl = (token: string) => `${siteUrl()}/test/${token}`;
const isToken = (t: string) => /^[A-Za-z0-9_-]{40,60}$/.test(t);

export async function loadQuestions(assessmentId: string): Promise<Question[]> {
  const { data } = await createAdminClient()
    .from("assessment_questions")
    .select("id, position, kind, prompt, case_text, options, correct, points")
    .eq("assessment_id", assessmentId)
    .order("position");
  return (data ?? []).map(toQuestion);
}

/** Creates an attempt for an application and returns the one-time readable token. */
export async function createAttempt(assessmentId: string, applicationId: string, createdBy: string | null): Promise<{ token: string } | { error: "exists" | "error" }> {
  const token = randomBytes(32).toString("base64url");
  const questions = await loadQuestions(assessmentId);
  const { error } = await createAdminClient().from("assessment_attempts").insert({
    assessment_id: assessmentId,
    application_id: applicationId,
    token_hash: hashToken(token),
    max_points: questions.reduce((s, q) => s + q.points, 0),
    created_by: createdBy,
  });
  if (error) return { error: error.code === "23505" ? "exists" : "error" };
  return { token };
}

/** Queues the invitation mail in the employer's form of address. */
export async function queueInvite(applicationId: string, token: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: app } = await admin
    .from("applications")
    .select("candidates(first_name, email), vacancies(title, employer_visible, organizations(name, candidate_tone))")
    .eq("id", applicationId)
    .single();
  const { data: att } = await admin.from("assessment_attempts").select("assessments(time_limit_minutes)").eq("token_hash", hashToken(token)).single();
  const email = app?.candidates?.email;
  if (!app || !email) return false;
  const org = app.vacancies?.organizations;
  const { error } = await admin.from("mail_outbox").insert({
    application_id: applicationId,
    to_email: email,
    template: "assessment_invite",
    data: {
      firstName: app.candidates?.first_name ?? "",
      jobTitle: app.vacancies?.title ?? "",
      employer: app.vacancies?.employer_visible ? (org?.name ?? null) : null,
      link: testUrl(token),
      minutes: (att?.assessments as unknown as { time_limit_minutes: number | null } | null)?.time_limit_minutes ?? null,
      tone: org?.candidate_tone === "du" ? "du" : "sie",
    },
  });
  return !error;
}

export type CandidateAttempt = {
  id: string;
  status: "sent" | "started" | "submitted";
  startedAt: string | null;
  deadlineAt: string | null;
  title: string;
  intro: string;
  minutes: number | null;
  jobTitle: string;
  employer: string | null;
  tone: "sie" | "du";
  color: string | null;
  questions: Question[];
  answers: Record<string, { answer: Answer; fileName: string | null }>;
};

/** Looks up an attempt by token. Unstarted links expire after LINK_DAYS. */
export async function attemptByToken(token: string): Promise<CandidateAttempt | null> {
  if (!isToken(token)) return null;
  const admin = createAdminClient();
  const { data: a } = await admin
    .from("assessment_attempts")
    .select("id, status, sent_at, started_at, deadline_at, assessment_id, applications(status), assessments(title, intro, time_limit_minutes, vacancies(title, employer_visible, organizations(name, candidate_tone, brand_color)))")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!a) return null;
  // A withdrawn application closes its test links (0027).
  if ((a.applications as { status?: string } | null)?.status === "withdrawn") return null;
  if (a.status === "sent" && Date.parse(a.sent_at) < Date.now() - LINK_DAYS * 86_400_000) return null;
  const s = a.assessments as unknown as { title: string; intro: string; time_limit_minutes: number | null; vacancies: { title: string; employer_visible: boolean; organizations: { name: string; candidate_tone: string; brand_color: string | null } | null } | null } | null;
  if (!s) return null;
  const org = s.vacancies?.organizations;
  const [questions, { data: rows }] = await Promise.all([
    loadQuestions(a.assessment_id),
    admin.from("assessment_answers").select("question_id, answer, file_name").eq("attempt_id", a.id),
  ]);
  return {
    id: a.id,
    status: a.status,
    startedAt: a.started_at,
    deadlineAt: a.deadline_at,
    title: s.title,
    intro: s.intro,
    minutes: s.time_limit_minutes,
    jobTitle: s.vacancies?.title ?? "",
    employer: s.vacancies?.employer_visible ? (org?.name ?? null) : null,
    tone: org?.candidate_tone === "du" ? "du" : "sie",
    color: org?.brand_color ?? null,
    questions,
    answers: Object.fromEntries((rows ?? []).map((r) => [r.question_id, { answer: r.answer as Answer, fileName: r.file_name }])),
  };
}

/** Closes an attempt: automatic points for closed questions, totals on the attempt. */
export async function finalizeAttempt(attempt: Pick<CandidateAttempt, "id" | "deadlineAt" | "questions">): Promise<void> {
  const admin = createAdminClient();
  const { data: rows } = await admin.from("assessment_answers").select("id, question_id, answer").eq("attempt_id", attempt.id);
  const byQuestion = new Map((rows ?? []).map((r) => [r.question_id, r]));
  let auto = 0;
  for (const q of attempt.questions) {
    const row = byQuestion.get(q.id);
    const p = autoPoints(q, (row?.answer as Answer) ?? null);
    if (p === null) continue;
    auto += p;
    if (row) await admin.from("assessment_answers").update({ auto_points: p }).eq("id", row.id);
  }
  const now = new Date();
  const late = attempt.deadlineAt ? now.getTime() > Date.parse(attempt.deadlineAt) : false;
  await admin
    .from("assessment_attempts")
    .update({ status: "submitted", submitted_at: now.toISOString(), auto_points: auto, late, max_points: attempt.questions.reduce((s, q) => s + q.points, 0) })
    .eq("id", attempt.id)
    .neq("status", "submitted");
}
