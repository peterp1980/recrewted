"use server";

import { ENTRY_PARAM, entryParam } from "@/lib/careers/profile";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { cookies } from "next/headers";
import { ATTR_COOKIE, parseAttribution } from "@/lib/tracking/attribution";
import { CONSENT_COOKIE, parseConsent } from "@/lib/tracking/consent";
import { redirect } from "next/navigation";
import { checkCv, CONSENT_VERSION, parseApplication, type ApplicationError } from "@/lib/apply/parse";
import { idFromSlug, jobPath } from "@/lib/jobs/format";
import { getPublicJob } from "@/lib/jobs/public";
import { processDueMails } from "@/lib/mail/outbox";
import { evaluate } from "@/lib/screening/rules";
import { questionsForVacancy } from "@/lib/screening/load";
import { createAdminClient } from "@/lib/supabase/admin";

export type ApplyState = {
  errors: (ApplicationError | "questions" | "cvSize" | "cvType" | "duplicate" | "closed" | "server")[];
  missingQuestions: string[];
  values: Record<string, string>;
};

const INCOMING = /^incoming\/[0-9a-f-]{36}$/;

/**
 * One-time signed upload target for the CV. The browser uploads directly to
 * the private bucket because Vercel limits request bodies to about 4.5 MB.
 * Unused incoming files are removed by the daily cleanup.
 */
export async function prepareCvUpload(): Promise<{ path: string; token: string } | null> {
  const path = `incoming/${randomUUID()}`;
  const { data, error } = await createAdminClient().storage.from("cvs").createSignedUploadUrl(path);
  if (error || !data) return null;
  return { path, token: data.token };
}

/** Delay for knockout rejections: an instant "no" feels automated. */
const REJECTION_DELAY_HOURS = 24;

const keep = (form: FormData): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string" && !k.startsWith("$")) out[k] = v.slice(0, 500);
  return out;
};

export async function submitApplication(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const slug = String(form.get("slug") ?? "");
  const vacancyId = idFromSlug(slug);
  const values = keep(form);
  const fail = (errors: ApplyState["errors"], missingQuestions: string[] = []): ApplyState => ({ errors, missingQuestions, values });

  // Honeypot: bots fill every field. Pretend success.
  if (String(form.get("website") ?? "") !== "") redirect(`/jobs/${slug}/bewerben/danke`);
  if (!vacancyId) return fail(["closed"]);

  const job = await getPublicJob(vacancyId).catch(() => null);
  if (!job) return fail(["closed"]);
  const questions = await questionsForVacancy(vacancyId).catch(() => null);
  if (!questions) return fail(["server"]);

  const { value, errors } = parseApplication(form);
  const ev = evaluate(questions, form);
  const all: ApplyState["errors"] = [...errors, ...(ev.missing.length ? (["questions"] as const) : [])];

  // The CV was uploaded by the browser to a one-time incoming path; verify it by content.
  const admin = createAdminClient();
  const cvPath = String(form.get("cvPath") ?? "");
  let cv: { bytes: Uint8Array; ext: string; contentType: string } | null = null;
  if (cvPath) {
    if (!INCOMING.test(cvPath)) return fail(["cvType"]);
    const dl = await admin.storage.from("cvs").download(cvPath);
    if (dl.error || !dl.data) return fail(["cvSize"]);
    const bytes = new Uint8Array(await dl.data.arrayBuffer());
    const check = checkCv(bytes);
    if (!check.ok) all.push(check.error === "size" ? "cvSize" : "cvType");
    else cv = { bytes, ext: check.ext, contentType: check.contentType };
  }
  if (all.length) return fail(all, ev.missing);

  // Origin (F12): UTM from the link the visitor came with; click IDs only with marketing consent.
  const jar = await cookies();
  const consent = parseConsent(jar.get(CONSENT_COOKIE)?.value);
  const stored = consent?.marketing ? parseAttribution(jar.get(ATTR_COOKIE)?.value) : null;
  const utm = (k: "utm_source" | "utm_medium" | "utm_campaign" | "utm_content") => values[k] || stored?.[k] || null;

  const knockedOut = ev.knockouts.length > 0;
  const entry = entryParam(values.quelle);
  const mailData = { firstName: value.firstName, jobTitle: job.title, employer: job.employerName, tone: job.tone };
  const { data, error } = await admin.rpc("submit_application", {
    p: {
      vacancy_id: vacancyId,
      first_name: value.firstName,
      last_name: value.lastName,
      email: value.email,
      phone: value.phone,
      talent_pool: value.talentPoolConsent,
      status: knockedOut ? "knockout_failed" : "screening",
      consent_version: CONSENT_VERSION,
      knockout_reasons: ev.knockouts,
      answers: [...ev.answers].map(([question_id, answer]) => ({ question_id, answer })),
      entry_point: entry ? ENTRY_PARAM[entry] : "jobboard",
      utm_source: utm("utm_source"),
      utm_medium: utm("utm_medium"),
      utm_campaign: utm("utm_campaign"),
      utm_content: utm("utm_content"),
      marketing_consent: Boolean(consent?.marketing),
      click_id_type: stored?.click_id_type ?? null,
      click_id: stored?.click_id ?? null,
      mails: [
        { template: "application_received", data: mailData },
        ...(knockedOut
          ? [{ template: "knockout_rejection", data: mailData, send_after: new Date(Date.now() + REJECTION_DELAY_HOURS * 3_600_000).toISOString() }]
          : []),
      ],
    },
  });
  if (error) {
    if (error.message.includes("duplicate_application")) return fail(["duplicate"]);
    if (error.message.includes("vacancy_not_active")) return fail(["closed"]);
    console.error("submit_application failed", error.message);
    return fail(["server"]);
  }

  const applicationId = (data as { application_id: string }).application_id;
  if (cv) {
    // CVs live in the private "cvs" bucket and are only reachable via short-lived signed URLs.
    const path = `${applicationId}/lebenslauf.${cv.ext}`;
    const up = await admin.storage.from("cvs").upload(path, cv.bytes, { contentType: cv.contentType, upsert: false });
    if (!up.error) await admin.from("applications").update({ cv_storage_path: path }).eq("id", applicationId);
    else console.error("cv upload failed", up.error.message);
    await admin.storage.from("cvs").remove([cvPath]);
  }

  // Send the confirmation right away, after the response is on its way.
  after(() => processDueMails(5).catch((e) => console.error("mail processing failed", e)));
  const q = new URLSearchParams({ ...(value.email ? {} : { tel: "1" }), ...(job.tone === "du" ? { du: "1" } : {}) }).toString();
  redirect(`${jobPath(job)}/bewerben/danke${q ? `?${q}` : ""}`);
}
