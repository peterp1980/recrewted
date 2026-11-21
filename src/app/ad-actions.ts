"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkAd, generateAd, TEMPLATES, type Channel, type TemplateKey } from "@/lib/ads/generator";
import { getSession } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { fromStored } from "@/lib/briefing/schema";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";

async function staffOnly() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!isStaff(s.role)) redirect("/");
  return s;
}
const page = (id: string, q: string) => `/admin/vacancies/${id}?a=${q}#anzeigen`;

async function context(vacancyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vacancies")
    .select("employer_visible, organizations(name), vacancy_briefings(data)")
    .eq("id", vacancyId)
    .single();
  return {
    supabase,
    briefing: fromStored(data?.vacancy_briefings?.data),
    employer: data?.employer_visible ? (data?.organizations?.name ?? null) : null,
  };
}

async function insertVersion(vacancyId: string, channel: Channel, templateKey: string | null, title: string, body: string) {
  const supabase = await createClient();
  const { data: last } = await supabase.from("job_ads").select("version").eq("vacancy_id", vacancyId).eq("channel", channel).order("version", { ascending: false }).limit(1);
  return supabase.from("job_ads").insert({ vacancy_id: vacancyId, channel, template_key: templateKey, version: (last?.[0]?.version ?? 0) + 1, title: title.slice(0, 200), body: body.slice(0, 10000), status: "draft" });
}

export async function generateAdVersion(form: FormData) {
  await staffOnly();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const key = String(form.get("template") ?? "") as TemplateKey;
  if (!isUuid(vacancyId) || !(key in TEMPLATES)) redirect("/admin");
  const { briefing, employer } = await context(vacancyId);
  const ad = generateAd(key, { briefing, employer });
  const { error } = await insertVersion(vacancyId, TEMPLATES[key].channel, key, ad.title, ad.body);
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(page(vacancyId, error ? "error" : "saved"));
}

export async function saveAdVersion(form: FormData) {
  await staffOnly();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const channel = String(form.get("channel") ?? "") as Channel;
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  if (!isUuid(vacancyId) || !["portal", "social"].includes(channel)) redirect("/admin");
  if (!title || !body) redirect(page(vacancyId, "error"));
  const { error } = await insertVersion(vacancyId, channel, String(form.get("templateKey") ?? "") || null, title, body);
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(page(vacancyId, error ? "error" : "saved"));
}

/** Approval re-runs all checks on the server; the previous approved version of the channel is archived. */
export async function approveAd(form: FormData) {
  const session = await staffOnly();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const adId = String(form.get("adId") ?? "");
  if (!isUuid(vacancyId) || !isUuid(adId)) redirect("/admin");
  const { supabase, briefing } = await context(vacancyId);
  const { data: ad } = await supabase.from("job_ads").select("id, channel, title, body").eq("id", adId).eq("vacancy_id", vacancyId).single();
  if (!ad) redirect(page(vacancyId, "error"));
  if (checkAd(ad, ad.channel as Channel, briefing).length) redirect(page(vacancyId, "blocked"));

  await supabase.from("job_ads").update({ status: "archived" }).eq("vacancy_id", vacancyId).eq("channel", ad.channel).eq("status", "approved");
  const { error } = await supabase.from("job_ads").update({ status: "approved", approved_by: session.userId, approved_at: new Date().toISOString() }).eq("id", adId);
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(page(vacancyId, error ? "error" : "approved"));
}
