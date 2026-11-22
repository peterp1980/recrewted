"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { isImportProvider, validSource } from "@/lib/imports/providers";
import { runImport } from "@/lib/imports/run";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";

// Job import sources per customer and the global switches. Admins only.

async function adminOnly(back: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect(`${back}?imp=forbidden#import`);
  return session;
}
const orgBack = (form: FormData) => {
  const id = String(form.get("organizationId") ?? "");
  if (!isUuid(id)) redirect("/admin/organizations");
  return { id, back: `/admin/organizations/${id}` };
};

export async function addImportSource(form: FormData) {
  const { id, back } = orgBack(form);
  const session = await adminOnly(back);
  const provider = String(form.get("provider") ?? "");
  let source = String(form.get("source") ?? "").trim();
  if (provider !== "jsonld") source = source.toLowerCase();
  if (!isImportProvider(provider) || !validSource(provider, source)) redirect(`${back}?imp=invalid#import`);
  const supabase = await createClient();
  const { data, error } = await supabase.from("job_imports").insert({ organization_id: id, provider, source, created_by: session.userId }).select("id").single();
  if (error || !data) redirect(`${back}?imp=${error?.code === "23505" ? "duplicate" : "error"}#import`);
  await audit(session.userId, "job_import_added", "job_imports", data.id, { provider, source });
  // First run right away, so the admin sees what comes in.
  await runImport(data.id, session.userId);
  revalidatePath(back);
  redirect(`${back}?imp=added#import`);
}

export async function runImportNow(form: FormData) {
  const { back } = orgBack(form);
  const session = await adminOnly(back);
  const importId = String(form.get("importId") ?? "");
  if (!isUuid(importId)) redirect(`${back}?imp=invalid#import`);
  await runImport(importId, session.userId);
  revalidatePath(back);
  redirect(`${back}?imp=ran#import`);
}

export async function toggleImportSource(form: FormData) {
  const { back } = orgBack(form);
  const session = await adminOnly(back);
  const importId = String(form.get("importId") ?? "");
  const enabled = form.get("enabled") === "on";
  if (!isUuid(importId)) redirect(`${back}?imp=invalid#import`);
  await (await createClient()).from("job_imports").update({ enabled }).eq("id", importId);
  await audit(session.userId, "job_import_switched", "job_imports", importId, { enabled });
  revalidatePath(back);
  redirect(`${back}?imp=saved#import`);
}

/** Removes the source; drafts that were created stay (a recruiter may already work on them). */
export async function deleteImportSource(form: FormData) {
  const { back } = orgBack(form);
  const session = await adminOnly(back);
  const importId = String(form.get("importId") ?? "");
  if (!isUuid(importId)) redirect(`${back}?imp=invalid#import`);
  await (await createClient()).from("job_imports").delete().eq("id", importId);
  await audit(session.userId, "job_import_deleted", "job_imports", importId, {});
  revalidatePath(back);
  redirect(`${back}?imp=deleted#import`);
}

export async function setFeatureSwitch(form: FormData) {
  const session = await adminOnly("/admin/kanaele");
  const key = String(form.get("key") ?? "");
  const enabled = form.get("enabled") === "on";
  if (!["import_customer_jobs", "external_jobs"].includes(key)) redirect("/admin/kanaele?ch=invalid");
  await (await createClient()).from("feature_switches").update({ enabled, updated_at: new Date().toISOString(), updated_by: session.userId }).eq("key", key);
  await audit(session.userId, "feature_switched", "feature_switches", null, { key, enabled });
  after(() => revalidatePath("/jobs"));
  revalidatePath("/admin/kanaele");
  redirect(`/admin/kanaele?ch=saved#import`);
}
