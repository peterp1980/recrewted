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
