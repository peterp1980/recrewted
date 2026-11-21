"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { PLATFORMS, utmCampaignFor, type Platform } from "@/lib/campaigns/tracking";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";

async function staffOnly() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!isStaff(s.role)) redirect("/");
  return s;
}
const page = (vacancyId: string, q: string) => `/admin/vacancies/${vacancyId}?k=${q}#kampagnen`;
const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/\./g, "").replace(",", ".").trim();
  return s === "" ? null : Number(s);
};
const date = (v: FormDataEntryValue | null) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : null);
const STATUSES = ["draft", "running", "paused", "ended"] as const;

/** recrewted ad accounts (MVP: owner = recrewted only). */
export async function createAdAccount(form: FormData) {
  await staffOnly();
  const platform = String(form.get("platform") ?? "") as Platform;
  const externalId = String(form.get("externalId") ?? "").trim().slice(0, 100);
  const name = String(form.get("name") ?? "").trim().slice(0, 100);
  if (!PLATFORMS.includes(platform) || externalId.length < 2 || name.length < 2) redirect("/admin/ad-accounts?s=invalid");
  const supabase = await createClient();
  const { error } = await supabase.from("ad_accounts").insert({ platform, owner: "recrewted", external_account_id: externalId, display_name: name });
  revalidatePath("/admin/ad-accounts");
  redirect(`/admin/ad-accounts?s=${error ? "invalid" : "saved"}`);
}

export async function createCampaign(form: FormData) {
  await staffOnly();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const accountId = String(form.get("adAccountId") ?? "");
  if (!isUuid(vacancyId)) redirect("/admin");
  const budget = num(form.get("budget"));
  const target = num(form.get("target"));
  const starts = date(form.get("startsOn"));
  const ends = date(form.get("endsOn"));
  if (!isUuid(accountId) || (budget !== null && (!Number.isFinite(budget) || budget < 0)) || (target !== null && (!Number.isInteger(target) || target < 0)) || (starts && ends && ends < starts))
    redirect(page(vacancyId, "invalid"));

  const supabase = await createClient();
  const [{ data: acc }, { data: v }] = await Promise.all([
    supabase.from("ad_accounts").select("platform, owner").eq("id", accountId).single(),
    supabase.from("vacancies").select("title").eq("id", vacancyId).single(),
  ]);
  if (!acc || acc.owner !== "recrewted" || !v) redirect(page(vacancyId, "invalid"));
  const id = crypto.randomUUID();
  const { error } = await supabase.from("campaigns").insert({
    id, vacancy_id: vacancyId, ad_account_id: accountId, channel: acc.platform, budget_eur: budget, starts_on: starts, ends_on: ends,
    target_qualified: target, status: "draft", utm_campaign: utmCampaignFor(v.title, id),
  });
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(page(vacancyId, error ? "error" : "saved"));
}

export async function setCampaignStatus(form: FormData) {
  await staffOnly();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const campaignId = String(form.get("campaignId") ?? "");
  const status = String(form.get("status") ?? "") as (typeof STATUSES)[number];
  if (!isUuid(vacancyId) || !isUuid(campaignId) || !STATUSES.includes(status)) redirect("/admin");
  const supabase = await createClient();
  const { error } = await supabase.from("campaigns").update({ status }).eq("id", campaignId).eq("vacancy_id", vacancyId);
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(page(vacancyId, error ? "error" : "saved"));
}

/** Daily costs, entered by hand until the platform APIs are connected. */
export async function saveCost(form: FormData) {
  await staffOnly();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const campaignId = String(form.get("campaignId") ?? "");
  const day = date(form.get("day"));
  const cost = num(form.get("cost"));
  const impressions = num(form.get("impressions"));
  const clicks = num(form.get("clicks"));
  if (!isUuid(vacancyId) || !isUuid(campaignId) || !day || cost === null || !Number.isFinite(cost) || cost < 0) redirect(page(vacancyId, "invalid"));
  const int = (n: number | null) => (n !== null && Number.isInteger(n) && n >= 0 ? n : null);
  const supabase = await createClient();
  const { error } = await supabase.from("ad_costs").upsert({ campaign_id: campaignId, day, cost_eur: cost, impressions: int(impressions), clicks: int(clicks) }, { onConflict: "campaign_id,day" });
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(page(vacancyId, error ? "error" : "saved"));
}
