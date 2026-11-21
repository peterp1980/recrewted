import { getMessages } from "@/i18n";
import { checkAd, TEMPLATES, type Channel, type TemplateKey } from "@/lib/ads/generator";
import { fromStored } from "@/lib/briefing/schema";
import { createClient } from "@/lib/supabase/server";
import { approveAd, generateAdVersion, saveAdVersion } from "@/app/ad-actions";
import { Notice } from "./Notice";
import { AiNotice } from "./AiNotice";
import { Sparkles } from "lucide-react";
import { aiAllowed } from "@/lib/ai/run";
import { aiAdDraft } from "@/app/ai-actions";

const input = "w-full rounded-lg border border-neutral-300 px-3 py-2";
const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });
const CHANNELS: Channel[] = ["portal", "social"];

/** Job ad generator (F8): generate, edit (each save is a version), check, approve. */
export async function AdsSection({ vacancyId, status, aiStatus }: { vacancyId: string; status?: string; aiStatus?: string }) {
  const t = getMessages().ads;
  const ai = getMessages().ai;
  const supabase = await createClient();
  const [{ data: ads }, { data: v }] = await Promise.all([
    supabase.from("job_ads").select("id, channel, version, title, body, status, template_key, approved_at, ai_recommendation_id").eq("vacancy_id", vacancyId).order("version", { ascending: false }),
    supabase.from("vacancies").select("organization_id, vacancy_briefings(data)").eq("id", vacancyId).single(),
  ]);
  const briefing = fromStored(v?.vacancy_briefings?.data);
  const aiOn = v?.organization_id ? await aiAllowed(v.organization_id, "assist") : false;

  const notice =
    status === "saved" ? <Notice kind="ok">{t.saved}</Notice>
    : status === "approved" ? <Notice kind="ok">{t.approved}</Notice>
    : status === "blocked" ? <Notice kind="error">{t.blocked}</Notice>
    : status === "error" ? <Notice kind="error">{t.error}</Notice>
    : null;

  return (
    <section id="anzeigen" aria-labelledby="ads-h" className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="ads-h" className="text-xl font-semibold">{t.title}</h2>
      <p className="text-ink/80">{t.lead}</p>
      {notice}
      <form action={generateAdVersion} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="vacancyId" value={vacancyId} />
        <label className="grid gap-1"><span>{t.template}</span>
          <select name="template" className="rounded-lg border border-neutral-300 px-3 py-2">
            {(Object.keys(TEMPLATES) as TemplateKey[]).map((k) => <option key={k} value={k}>{TEMPLATES[k].label}</option>)}
          </select>
        </label>
        <button type="submit" className="rounded-lg border border-neutral-300 px-4 py-2 hover:bg-brand-50">{t.generate}</button>
      </form>
      {aiOn && (
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((ch) => (
            <form key={ch} action={aiAdDraft}>
              <input type="hidden" name="vacancyId" value={vacancyId} />
              <input type="hidden" name="channel" value={ch} />
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-violet-900 hover:bg-violet-100"><Sparkles className="h-4 w-4" aria-hidden="true" />{ai.adButton(t.channels[ch])}</button>
            </form>
          ))}
        </div>
      )}
      {aiStatus && <AiNotice status={aiStatus} />}

      {CHANNELS.map((ch) => {
        const versions = (ads ?? []).filter((a) => a.channel === ch);
        const latest = versions[0];
        const approved = versions.find((a) => a.status === "approved");
        const issues = latest ? checkAd(latest, ch, briefing) : [];
        return (
          <div key={ch} className="flex flex-col gap-2 rounded-2xl bg-white p-3">
            <h3 className="font-semibold">{t.channels[ch]}</h3>
            {!latest ? <p className="text-muted">{t.none}</p> : (
              <>
                {latest.ai_recommendation_id && <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900"><span className="font-semibold">{ai.badge}:</span> {ai.disclaimer}</p>}
                <p className="text-sm text-muted">
                  {t.version} {latest.version} · {t.status[latest.status]}
                  {approved && approved.id !== latest.id ? ` · ${t.status.approved}: ${t.version} ${approved.version}` : ""}
                  {approved?.approved_at ? ` (${t.approvedBy} ${fmt.format(new Date(approved.approved_at))})` : ""}
                </p>
                <form action={saveAdVersion} className="grid gap-2">
                  <input type="hidden" name="vacancyId" value={vacancyId} />
                  <input type="hidden" name="channel" value={ch} />
                  <input type="hidden" name="templateKey" value={latest.template_key ?? ""} />
                  {latest.ai_recommendation_id && <input type="hidden" name="aiRecId" value={latest.ai_recommendation_id} />}
                  <label className="grid gap-1"><span>{t.headline}</span><input name="title" defaultValue={latest.title} maxLength={200} className={input} /></label>
                  <label className="grid gap-1"><span>{t.body}</span><textarea name="body" defaultValue={latest.body} rows={ch === "portal" ? 14 : 5} className={input} /></label>
                  <button type="submit" className="justify-self-start rounded-lg border border-neutral-300 px-4 py-2 hover:bg-white">{t.saveVersion}</button>
                </form>
                {issues.length ? (
                  <ul role="status" className="ml-5 list-disc text-sm text-red-800">
                    {issues.map((i) => <li key={i.kind}>{t.issues[i.kind]}{i.detail ? `: ${i.detail.join(", ")}` : ""}</li>)}
                  </ul>
                ) : <p className="text-sm text-emerald-800">{t.checksOk}</p>}
                {latest.status !== "approved" && (
                  <form action={approveAd}>
                    <input type="hidden" name="vacancyId" value={vacancyId} />
                    <input type="hidden" name="adId" value={latest.id} />
                    <button type="submit" disabled={issues.length > 0} className="rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800 disabled:opacity-50">{t.approve}</button>
                  </form>
                )}
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
