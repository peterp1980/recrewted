"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { processDueMails } from "@/lib/mail/outbox";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { signToken, verifyToken } from "./token";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Same answer whether or not the address is known (no account enumeration). */
export async function requestDataLink(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const secret = process.env.DATA_REQUEST_SECRET;
  if (!secret) redirect("/datenschutz/anfrage?s=unavailable");
  if (EMAIL.test(email)) {
    const admin = createAdminClient();
    const { data: cand } = await admin.from("candidates").select("id, first_name").ilike("email", email).limit(1).maybeSingle();
    if (cand) {
      await admin.from("mail_outbox").insert({
        candidate_id: cand.id,
        to_email: email,
        template: "data_request",
        data: { firstName: cand.first_name, jobTitle: "", link: `${siteUrl()}/datenschutz/anfrage/${signToken(cand.id, secret)}` },
      });
      after(() => processDueMails(5).catch(() => {}));
    }
  }
  redirect("/datenschutz/anfrage?s=sent");
}

/** Deletes everything about the candidate (cascades to applications, answers, ratings, attribution, mails). */
export async function deleteMyData(form: FormData) {
  const token = String(form.get("token") ?? "");
  const secret = process.env.DATA_REQUEST_SECRET;
  const id = secret ? verifyToken(token, secret) : null;
  if (!id) redirect("/datenschutz/anfrage?s=invalid");
  const admin = createAdminClient();
  const { data: apps } = await admin
    .from("applications")
    .select("cv_storage_path, assessment_attempts(assessment_answers(file_path))")
    .eq("candidate_id", id);
  const paths = (apps ?? []).map((a) => a.cv_storage_path).filter((p): p is string => Boolean(p));
  // Uploaded work samples from tests (0015) go too.
  const uploads = (apps ?? [])
    .flatMap((a) => (a.assessment_attempts ?? []).flatMap((t) => (t.assessment_answers ?? []).map((x) => x.file_path)))
    .filter((p): p is string => Boolean(p));
  const { error } = await admin.from("candidates").delete().eq("id", id);
  if (error) redirect("/datenschutz/anfrage?s=unavailable");
  if (paths.length) await admin.storage.from("cvs").remove(paths);
  if (uploads.length) await admin.storage.from("assessment-uploads").remove(uploads);
  await admin.from("audit_log").insert({ action: "gdpr_delete", table_name: "candidates", record_id: id, details: { by: "data_subject" } });
  redirect("/datenschutz/anfrage?s=deleted");
}
