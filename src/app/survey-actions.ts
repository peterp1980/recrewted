"use server";

import { redirect } from "next/navigation";
import { verifySurveyToken } from "@/lib/survey/token";
import { createAdminClient } from "@/lib/supabase/admin";

/** Saves the one answer (once). The link proves who answers; results are only shown aggregated. */
export async function answerSurvey(form: FormData) {
  const token = String(form.get("token") ?? "");
  const secret = process.env.DATA_REQUEST_SECRET;
  const app = secret ? verifySurveyToken(token, secret) : null;
  if (!app) redirect("/umfrage/ungueltig");
  const score = Number(form.get("score"));
  if (!Number.isInteger(score) || score < 1 || score > 5) redirect(`/umfrage/${token}?s=invalid`);
  const comment = String(form.get("comment") ?? "").trim().slice(0, 1000) || null;
  const { data } = await createAdminClient()
    .from("candidate_surveys")
    .update({ score, comment, answered_at: new Date().toISOString() })
    .eq("application_id", app)
    .is("answered_at", null)
    .select("application_id");
  redirect(`/umfrage/${token}?s=${data?.length ? "thanks" : "done"}`);
}
