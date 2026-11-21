import Link from "next/link";
import { getMessages } from "@/i18n";
import { trackingLink, type Platform } from "@/lib/campaigns/tracking";
import { jobPath } from "@/lib/jobs/format";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { createCampaign, saveCost, setCampaignStatus } from "@/app/campaign-actions";
import { Notice } from "./Notice";

const input = "w-full rounded-lg border border-neutral-300 px-3 py-2";
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const STATUSES = ["draft", "running", "paused", "ended"] as const;

/** Managed campaigns per vacancy (F7): account, budget, period, target, status, tracking link, daily costs. */
export async function CampaignsSection({ vacancyId, status }: { vacancyId: string; status?: string }) {
  const m = getMessages();
  const t = m.campaigns;
  const supabase = await createClient();
  const [{ data: v }, { data: accounts }, { data: campaigns }] = await Promise.all([
    supabase.from("vacancies").select("id, title, location, status").eq("id", vacancyId).single(),
    supabase.from("ad_accounts").select("id, platform, display_name").eq("owner", "recrewted").order("platform"),
    supabase.from("campaigns").select("id, channel, budget_eur, starts_on, ends_on, target_qualified, status, utm_campaign, ad_costs(cost_eur)").eq("vacancy_id", vacancyId).order("created_at"),
  ]);
  if (!v) return null;
  const jobUrl = `${siteUrl()}${jobPath(v)}`;
  const today = new Date().toISOString().slice(0, 10);

  const notice =
    status === "saved" ? <Notice kind="ok">{t.saved}</Notice>
    : status === "invalid" ? <Notice kind="error">{t.invalid}</Notice>
    : status === "error" ? <Notice kind="error">{t.error}</Notice>
    : null;

  return (
    <section id="kampagnen" aria-labelledby="kamp-h" className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="kamp-h" className="text-xl font-semibold">{t.title}</h2>
        <Link href="/admin/ad-accounts" className="text-sm underline">{t.manageAccounts}</Link>
      </div>
      {notice}
      {campaigns?.length ? (
        <ul className="flex flex-col gap-3">
          {campaigns.map((c) => {
            const spend = (c.ad_costs ?? []).reduce((s, x) => s + Number(x.cost_eur), 0);
            const link = c.utm_campaign ? trackingLink(jobUrl, c.channel as Platform, c.utm_campaign) : null;
            return (
              <li key={c.id} className="flex flex-col gap-2 rounded-2xl bg-white p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{m.adAccounts.platforms[c.channel as Platform] ?? c.channel}</p>
                  <p className="text-sm text-ink/80">
                    {t.spend}: {eur.format(spend)}{c.budget_eur !== null ? ` / ${eur.format(Number(c.budget_eur))}` : ""}
                    {c.target_qualified !== null ? ` · ${t.target}: ${c.target_qualified}` : ""}
                    {c.starts_on ? ` · ${c.starts_on}${c.ends_on ? ` – ${c.ends_on}` : ""}` : ""}
                  </p>
                </div>
                {link && (
                  <div className="text-sm">
                    <p className="font-medium">{t.link}</p>
                    <code className="block overflow-x-auto whitespace-nowrap rounded bg-white p-2">{link}</code>
                    <p className="text-muted">{v.status === "active" ? t.linkHint : t.notPublic}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-4">
                  <form action={setCampaignStatus} className="flex items-end gap-2">
                    <input type="hidden" name="vacancyId" value={vacancyId} />
                    <input type="hidden" name="campaignId" value={c.id} />
                    <label className="grid gap-1 text-sm"><span>{t.status}</span>
                      <select name="status" defaultValue={c.status} className="rounded-lg border border-neutral-300 px-2 py-1">
                        {STATUSES.map((s) => <option key={s} value={s}>{t.statuses[s]}</option>)}
                      </select>
                    </label>
                    <button type="submit" className="rounded-lg border border-neutral-300 px-3 py-1 text-sm hover:bg-white">{t.save}</button>
                  </form>
                  <form action={saveCost} className="flex flex-wrap items-end gap-2 text-sm">
                    <input type="hidden" name="vacancyId" value={vacancyId} />
                    <input type="hidden" name="campaignId" value={c.id} />
                    <label className="grid gap-1"><span>{t.day}</span><input type="date" name="day" defaultValue={today} className="rounded-lg border border-neutral-300 px-2 py-1" /></label>
                    <label className="grid gap-1"><span>{t.cost}</span><input name="cost" inputMode="decimal" required className="w-24 rounded-lg border border-neutral-300 px-2 py-1" /></label>
                    <label className="grid gap-1"><span>{t.impressions}</span><input name="impressions" inputMode="numeric" className="w-24 rounded-lg border border-neutral-300 px-2 py-1" /></label>
                    <label className="grid gap-1"><span>{t.clicks}</span><input name="clicks" inputMode="numeric" className="w-20 rounded-lg border border-neutral-300 px-2 py-1" /></label>
                    <button type="submit" className="rounded-lg border border-neutral-300 px-3 py-1 hover:bg-white">{t.costs}</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-muted">{t.none}</p>}

      <details className="rounded-2xl border border-neutral-200 bg-white p-3">
        <summary className="cursor-pointer font-medium">{t.add}</summary>
        {accounts?.length ? (
          <form action={createCampaign} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="vacancyId" value={vacancyId} />
            <label className="grid gap-1 sm:col-span-2"><span>{t.account}</span>
              <select name="adAccountId" required className={input}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{m.adAccounts.platforms[a.platform as Platform]} – {a.display_name}</option>)}
              </select>
            </label>
            <label className="grid gap-1"><span>{t.budget}</span><input name="budget" inputMode="decimal" className={input} /></label>
            <label className="grid gap-1"><span>{t.target}</span><input name="target" inputMode="numeric" className={input} /></label>
            <label className="grid gap-1"><span>{t.start}</span><input name="startsOn" type="date" className={input} /></label>
            <label className="grid gap-1"><span>{t.end}</span><input name="endsOn" type="date" className={input} /></label>
            <p className="text-sm text-muted sm:col-span-2">{t.customerAccountsLater}</p>
            <button type="submit" className="justify-self-start rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">{t.add}</button>
          </form>
        ) : <p className="mt-2 text-muted">{t.noAccounts} <Link href="/admin/ad-accounts" className="underline">{t.manageAccounts}</Link></p>}
      </details>
    </section>
  );
}
