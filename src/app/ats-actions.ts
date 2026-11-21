"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isStaff } from "@/lib/auth/roles";
import { getSession, type Session } from "@/lib/auth/session";
import { encryptSecret, decryptSecret, secretHint } from "@/lib/ats/crypto";
import { masterSecret, processAtsTransfers } from "@/lib/ats/process";
import { isProvider, parseConfig, testConnection } from "@/lib/ats/providers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";

// ATS connection of a customer: customers and recrewted staff switch it on, enter the key and map jobs.
// Writes go through the service role because signed-in users have no write access to the table (0022);
// therefore every action checks staff role or membership itself first.

const TRIGGERS = ["shortlist", "interview", "manual"] as const;

function page(form: FormData, orgId: string, status: string, extra = "") {
  const base = form.get("from") === "admin" ? `/admin/organizations/${orgId}?` : `/portal/integrationen?org=${orgId}&`;
  return `${base}ats=${status}${extra}#ats`;
}

async function authorize(orgId: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isUuid(orgId)) redirect("/");
  if (isStaff(session.role)) return session;
  const supabase = await createClient();
  const { data } = await supabase.from("customer_members").select("organization_id").eq("organization_id", orgId).eq("profile_id", session.userId).maybeSingle();
  if (!data) redirect("/portal");
  return session;
}

const refresh = (orgId: string) => {
  revalidatePath("/portal/integrationen");
  revalidatePath(`/admin/organizations/${orgId}`);
};

export async function saveAtsConnection(form: FormData) {
  const orgId = String(form.get("organizationId") ?? "");
  const session = await authorize(orgId);
  const provider = String(form.get("provider") ?? "");
  const trigger = String(form.get("trigger") ?? "");
  if (!isProvider(provider) || !(TRIGGERS as readonly string[]).includes(trigger)) redirect(page(form, orgId, "invalid"));
  const parsed = parseConfig(provider, form);
  if (!parsed.ok) redirect(page(form, orgId, "invalid", `&field=${encodeURIComponent(parsed.field)}`));
  const master = masterSecret();
  if (!master) redirect(page(form, orgId, "nosecret"));

  const admin = createAdminClient();
  const { data: existing } = await admin.from("ats_connections").select("provider, secret_enc").eq("organization_id", orgId).maybeSingle();
  const secret = String(form.get("secret") ?? "").trim();
  if (secret && (secret.length < (provider === "webhook" ? 16 : 8) || secret.length > 500 || /\s/.test(secret))) redirect(page(form, orgId, "badkey"));
  // A new system needs a new key; the old one is never reused for another vendor.
  const keepKey = !secret && existing?.secret_enc && existing.provider === provider;
  const enabled = form.get("enabled") === "on";
  if (enabled && !secret && !keepKey) redirect(page(form, orgId, "needkey"));

  const row = {
    organization_id: orgId,
    provider,
    enabled,
    trigger_on: trigger,
    config: parsed.config,
    ...(secret ? { secret_enc: encryptSecret(secret, master), secret_hint: secretHint(secret) } : keepKey ? {} : { secret_enc: null, secret_hint: null }),
    ...(existing?.provider !== provider ? { remote_jobs: [], last_test_at: null, last_test_ok: null } : {}),
    last_error: null,
    updated_by: session.userId,
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("ats_connections").upsert(row, { onConflict: "organization_id" });
  if (!error) {
    await admin.from("audit_log").insert({ actor: session.userId, action: "ats_connection_saved", table_name: "ats_connections", details: { organizationId: orgId, provider, enabled, trigger, keyChanged: Boolean(secret) } });
  }
  refresh(orgId);
  redirect(page(form, orgId, error ? "error" : "saved"));
}

export async function testAtsConnection(form: FormData) {
  const orgId = String(form.get("organizationId") ?? "");
  await authorize(orgId);
  const master = masterSecret();
  const admin = createAdminClient();
  const { data: conn } = await admin.from("ats_connections").select("id, provider, config, secret_enc").eq("organization_id", orgId).maybeSingle();
  const secret = conn?.secret_enc && master ? decryptSecret(conn.secret_enc, master) : null;
  if (!conn || !isProvider(conn.provider) || !secret) redirect(page(form, orgId, "needkey"));
  const r = await testConnection(conn.provider, { config: (conn.config ?? {}) as Record<string, string>, secret, fetch });
  await admin
    .from("ats_connections")
    .update({ last_test_at: new Date().toISOString(), last_test_ok: r.ok, last_error: r.ok ? null : r.message, ...(r.jobs ? { remote_jobs: r.jobs.slice(0, 300) } : {}) })
    .eq("id", conn.id);
  refresh(orgId);
  redirect(page(form, orgId, r.ok ? "tested" : "testfail", `&msg=${encodeURIComponent(r.message.slice(0, 300))}`));
}

export async function removeAtsConnection(form: FormData) {
  const orgId = String(form.get("organizationId") ?? "");
  const session = await authorize(orgId);
  const admin = createAdminClient();
  const { error } = await admin.from("ats_connections").delete().eq("organization_id", orgId);
  if (!error) await admin.from("audit_log").insert({ actor: session.userId, action: "ats_connection_removed", table_name: "ats_connections", details: { organizationId: orgId } });
  refresh(orgId);
  redirect(page(form, orgId, error ? "error" : "removed"));
}

/** Maps vacancies of the customer to jobs in their ATS (one field per vacancy). */
export async function saveAtsJobIds(form: FormData) {
  const orgId = String(form.get("organizationId") ?? "");
  await authorize(orgId);
  const admin = createAdminClient();
  const { data: vacancies } = await admin.from("vacancies").select("id, ats_job_id").eq("organization_id", orgId);
  let error = false;
  for (const v of vacancies ?? []) {
    if (!form.has(`job_${v.id}`)) continue;
    const val = String(form.get(`job_${v.id}`) ?? "").trim().slice(0, 100) || null;
    if (val !== null && !/^[A-Za-z0-9_.:-]+$/.test(val)) {
      error = true;
      continue;
    }
    if (val !== v.ats_job_id) {
      const r = await admin.from("vacancies").update({ ats_job_id: val }).eq("id", v.id).eq("organization_id", orgId);
      if (r.error) error = true;
    }
  }
  refresh(orgId);
  redirect(page(form, orgId, error ? "jobinvalid" : "jobs"));
}

/** Button on the application: hand over now (or again after an error). */
export async function transferToAts(form: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const applicationId = String(form.get("applicationId") ?? "");
  if (!isUuid(applicationId)) redirect("/");
  const back = (s: string) => `${isStaff(session.role) ? "/admin" : "/portal"}/applications/${applicationId}?ats=${s}#ats`;
  // Visible through the user's own access (RLS): staff, or the customer once shortlisted.
  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("id, vacancies(organization_id)").eq("id", applicationId).maybeSingle();
  if (!app?.vacancies) redirect(back("error"));
  const admin = createAdminClient();
  const { data: conn } = await admin.from("ats_connections").select("id, provider, enabled").eq("organization_id", app.vacancies.organization_id).maybeSingle();
  if (!conn?.enabled) redirect(back("off"));
  const { data: existing } = await admin.from("ats_transfers").select("id, status").eq("application_id", applicationId).eq("connection_id", conn.id).maybeSingle();
  if (existing?.status === "sent") redirect(back("already"));
  const { error } = existing
    ? await admin.from("ats_transfers").update({ status: "pending", attempts: 0, error: null, requested_by: session.userId }).eq("id", existing.id)
    : await admin.from("ats_transfers").insert({ application_id: applicationId, connection_id: conn.id, provider: conn.provider, requested_by: session.userId });
  if (error) redirect(back("error"));
  // Done in the request (one transfer) so the result shows right away; the cron catches anything left.
  await processAtsTransfers(5).catch((e) => console.error("ats transfer failed", e));
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath(`/portal/applications/${applicationId}`);
  redirect(back("done"));
}
