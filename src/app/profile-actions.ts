"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { processDueMails } from "@/lib/mail/outbox";
import { prefsFromForm } from "@/lib/profile/alerts";
import { candidateFromToken, sendProfileLink } from "@/lib/profile/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Applicant profile (no account, no password): access via a signed link from the e-mail.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Always answers the same, so the form does not reveal which addresses are known. */
export async function requestProfileLink(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  if (String(form.get("website") ?? "") !== "") redirect("/profil?s=sent"); // honeypot
  if (!EMAIL.test(email)) redirect("/profil?s=invalid");
  const { data } = await createAdminClient().from("candidates").select("id").ilike("email", email).order("created_at").limit(1).maybeSingle();
  if (data) {
    await sendProfileLink(data.id);
    after(() => processDueMails(5).catch((e) => console.error("mail processing failed", e)));
  }
  redirect("/profil?s=sent");
}

function candidate(form: FormData): { id: string; token: string } {
  const token = String(form.get("token") ?? "");
  const id = candidateFromToken(token);
  if (!id) redirect("/profil?s=expired");
  return { id, token };
}

export async function saveProfileData(form: FormData) {
  const { id, token } = candidate(form);
  const first = String(form.get("firstName") ?? "").trim().slice(0, 80);
  const last = String(form.get("lastName") ?? "").trim().slice(0, 80);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 40) || null;
  if (!first || !last || (phone && !/^[+\d][\d\s/()-]{5,}$/.test(phone))) redirect(`/profil/${token}?s=invalid#daten`);
  const { error } = await createAdminClient().from("candidates").update({ first_name: first, last_name: last, phone }).eq("id", id);
  revalidatePath(`/profil/${token}`);
  redirect(`/profil/${token}?s=${error ? "error" : "saved"}#daten`);
}

/** Job alerts: on means talent pool consent (with date), off withdraws it right away. */
export async function saveJobAlerts(form: FormData) {
  const { id, token } = candidate(form);
  const on = form.get("alerts") === "on";
  const admin = createAdminClient();
  const { data: c } = await admin.from("candidates").select("talent_pool_consent_at").eq("id", id).single();
  const { error } = await admin
    .from("candidates")
    .update({ alert_prefs: prefsFromForm(form), talent_pool_consent_at: on ? (c?.talent_pool_consent_at ?? new Date().toISOString()) : null })
    .eq("id", id);
  if (!error && on !== Boolean(c?.talent_pool_consent_at)) {
    await admin.from("audit_log").insert({ action: on ? "talent_pool_consent" : "talent_pool_withdrawn", table_name: "candidates", record_id: id, details: { by: "data_subject" } });
  }
  revalidatePath(`/profil/${token}`);
  redirect(`/profil/${token}?s=${error ? "error" : "alerts"}#jobs`);
}

/** The candidate withdraws an application (any time). Booked interview and pending mails are cancelled. */
export async function withdrawApplication(form: FormData) {
  const { id, token } = candidate(form);
  const app = String(form.get("applicationId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(app) || form.get("confirm") !== "on") redirect(`/profil/${token}?s=confirm#bewerbungen`);
  const { data, error } = await createAdminClient().rpc("withdraw_application", { app, cand: id });
  if (!error && data) after(() => processDueMails(5).catch((e) => console.error("mail processing failed", e)));
  revalidatePath(`/profil/${token}`);
  redirect(`/profil/${token}?s=${error ? "error" : data ? "withdrawn" : "notOpen"}#bewerbungen`);
}

/** After a rejection: ask for a short, job-related reason. A recruiter answers by e-mail. */
export async function requestRejectionFeedback(form: FormData) {
  const { id, token } = candidate(form);
  const app = String(form.get("applicationId") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(app)) redirect(`/profil/${token}`);
  const admin = createAdminClient();
  const { data: a } = await admin.from("applications").select("id, status").eq("id", app).eq("candidate_id", id).maybeSingle();
  if (!a || a.status !== "rejected") redirect(`/profil/${token}?s=error#bewerbungen`);
  const { error } = await admin.from("feedback_requests").upsert({ application_id: app }, { onConflict: "application_id", ignoreDuplicates: true });
  if (!error) await admin.from("audit_log").insert({ action: "feedback_requested", table_name: "applications", record_id: app, details: { by: "data_subject" } });
  revalidatePath(`/profil/${token}`);
  redirect(`/profil/${token}?s=${error ? "error" : "feedbackRequested"}#bewerbungen`);
}
