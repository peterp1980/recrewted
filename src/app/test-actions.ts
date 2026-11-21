"use server";

import { randomUUID } from "node:crypto";
import { EVENT_TYPES, GRACE_SECONDS, normalizeAnswer, UPLOAD_MAX_BYTES, UPLOAD_TYPES, type EventType } from "@/lib/assessments/model";
import { attemptByToken, finalizeAttempt, type CandidateAttempt } from "@/lib/assessments/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Actions of the candidate test page. Candidates are not signed in: the random link is the key.
// Every action re-checks the attempt's state and the deadline on the server.

type TestError = "invalid" | "closed" | "answer" | "upload" | "error";
type Result = { ok: true } | { ok: false; error: TestError };
const BUCKET = "assessment-uploads";

const open = (a: CandidateAttempt | null): a is CandidateAttempt => !!a && a.status === "started";
const overdue = (a: CandidateAttempt) => !!a.deadlineAt && Date.now() > Date.parse(a.deadlineAt) + GRACE_SECONDS * 1000;

/** Past the deadline the attempt is closed with what was saved until then. */
async function closeIfOverdue(a: CandidateAttempt): Promise<boolean> {
  if (!overdue(a)) return false;
  await finalizeAttempt(a);
  return true;
}

export async function startTest(token: string): Promise<Result> {
  const a = await attemptByToken(token);
  if (!a) return { ok: false, error: "invalid" };
  if (a.status !== "sent") return { ok: true };
  const now = new Date();
  const { error } = await createAdminClient()
    .from("assessment_attempts")
    .update({ status: "started", started_at: now.toISOString(), deadline_at: a.minutes ? new Date(now.getTime() + a.minutes * 60_000).toISOString() : null })
    .eq("id", a.id)
    .eq("status", "sent");
  return error ? { ok: false, error: "error" } : { ok: true };
}

export async function saveTestAnswer(token: string, questionId: string, raw: unknown): Promise<Result> {
  const a = await attemptByToken(token);
  if (!open(a)) return { ok: false, error: a ? "closed" : "invalid" };
  if (await closeIfOverdue(a)) return { ok: false, error: "closed" };
  const q = a.questions.find((x) => x.id === questionId);
  if (!q) return { ok: false, error: "answer" };
  const answer = normalizeAnswer(q, raw);
  if (answer === undefined) return { ok: false, error: "answer" };
  const { error } = await createAdminClient()
    .from("assessment_answers")
    .upsert({ attempt_id: a.id, question_id: q.id, answer, updated_at: new Date().toISOString() }, { onConflict: "attempt_id,question_id" });
  return error ? { ok: false, error: "error" } : { ok: true };
}

/** Signed upload target in the private bucket; the browser uploads directly (Vercel limits request bodies). */
export async function prepareTestUpload(token: string, questionId: string, type: string, size: number): Promise<{ ok: true; path: string; uploadToken: string } | { ok: false; error: TestError }> {
  const a = await attemptByToken(token);
  if (!open(a)) return { ok: false, error: a ? "closed" : "invalid" };
  if (await closeIfOverdue(a)) return { ok: false, error: "closed" };
  const q = a.questions.find((x) => x.id === questionId && x.kind === "upload");
  const ext = UPLOAD_TYPES[type];
  if (!q || !ext || !(size > 0 && size <= UPLOAD_MAX_BYTES)) return { ok: false, error: "upload" };
  const path = `${a.id}/${q.id}-${randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "error" };
  return { ok: true, path, uploadToken: data.token };
}

/** Records the uploaded file and removes the one it replaces. */
export async function confirmTestUpload(token: string, questionId: string, path: string, fileName: string): Promise<Result> {
  const a = await attemptByToken(token);
  if (!open(a)) return { ok: false, error: a ? "closed" : "invalid" };
  if (!path.startsWith(`${a.id}/${questionId}-`) || !a.questions.some((q) => q.id === questionId && q.kind === "upload")) return { ok: false, error: "upload" };
  const admin = createAdminClient();
  const { data: found } = await admin.storage.from(BUCKET).list(a.id, { search: path.slice(a.id.length + 1) });
  if (!found?.length) return { ok: false, error: "upload" };
  const { data: old } = await admin.from("assessment_answers").select("file_path").eq("attempt_id", a.id).eq("question_id", questionId).maybeSingle();
  const name = fileName.replace(/[\r\n\\/]+/g, " ").trim().slice(0, 200) || "Datei";
  const { error } = await admin
    .from("assessment_answers")
    .upsert({ attempt_id: a.id, question_id: questionId, answer: { file: name }, file_path: path, file_name: name, updated_at: new Date().toISOString() }, { onConflict: "attempt_id,question_id" });
  if (error) return { ok: false, error: "error" };
  if (old?.file_path && old.file_path !== path) await admin.storage.from(BUCKET).remove([old.file_path]);
  return { ok: true };
}

const MAX_EVENTS_PER_CALL = 50;
const MAX_EVENTS_PER_ATTEMPT = 2000;

/** Browser log: only type, time and question – never content. */
export async function logTestEvents(token: string, events: { type: string; questionId?: string | null }[]): Promise<Result> {
  const a = await attemptByToken(token);
  if (!open(a)) return { ok: false, error: a ? "closed" : "invalid" };
  const admin = createAdminClient();
  const { count } = await admin.from("assessment_events").select("id", { count: "exact", head: true }).eq("attempt_id", a.id);
  if ((count ?? 0) >= MAX_EVENTS_PER_ATTEMPT) return { ok: true };
  const ids = new Set(a.questions.map((q) => q.id));
  const rows = (Array.isArray(events) ? events : [])
    .slice(0, MAX_EVENTS_PER_CALL)
    .filter((e) => (EVENT_TYPES as readonly string[]).includes(e?.type))
    .map((e) => ({ attempt_id: a.id, type: e.type as EventType, question_id: e.questionId && ids.has(e.questionId) ? e.questionId : null }));
  if (rows.length === 0) return { ok: true };
  const { error } = await admin.from("assessment_events").insert(rows);
  return error ? { ok: false, error: "error" } : { ok: true };
}

export async function submitTest(token: string): Promise<Result> {
  const a = await attemptByToken(token);
  if (!a) return { ok: false, error: "invalid" };
  if (a.status === "submitted") return { ok: true };
  if (a.status !== "started") return { ok: false, error: "closed" };
  await finalizeAttempt(a);
  return { ok: true };
}
