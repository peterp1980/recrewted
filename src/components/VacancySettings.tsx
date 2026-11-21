import { getMessages } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { updateVacancySettings } from "@/app/vacancy-actions";

const input = "w-full rounded-md border border-neutral-400 px-3 py-2";
const STATUSES = ["draft", "contract_pending", "active", "paused", "filled", "closed"] as const;

/** Staff settings: publication status, openings, pricing, confidential search. */
export async function VacancySettings({ vacancyId }: { vacancyId: string }) {
  const m = getMessages();
  const t = m.settings;
  const supabase = await createClient();
  const { data: v } = await supabase.from("vacancies").select("status, openings, pricing_model, price_eur, media_markup_pct, employer_visible").eq("id", vacancyId).single();
  if (!v) return null;
  return (
    <section id="einstellungen" aria-labelledby="einst-h" className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4">
      <h2 id="einst-h" className="text-xl font-semibold">{t.title}</h2>
      <form action={updateVacancySettings} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="vacancyId" value={vacancyId} />
        <label className="grid gap-1 sm:col-span-2">
          <span className="font-medium">{t.status}</span>
          <span className="text-sm text-neutral-600">{t.statusHint}</span>
          <select name="status" defaultValue={v.status} className={input}>
            {STATUSES.map((s) => <option key={s} value={s}>{m.vacancy.status[s]}</option>)}
          </select>
        </label>
        <label className="grid gap-1"><span>{t.openings}</span><input name="openings" type="number" min={1} max={100} defaultValue={v.openings} className={input} /></label>
        <label className="grid gap-1">
          <span>{t.pricingModel}</span>
          <select name="pricingModel" defaultValue={v.pricing_model ?? ""} className={input}>
            <option value="">{t.none}</option>
            {(Object.keys(t.pricing) as (keyof typeof t.pricing)[]).map((k) => <option key={k} value={k}>{t.pricing[k]}</option>)}
          </select>
        </label>
        <label className="grid gap-1"><span>{t.price}</span><input name="price" inputMode="decimal" defaultValue={v.price_eur ?? ""} className={input} /></label>
        <label className="grid gap-1"><span>{t.markup}</span><span className="text-sm text-neutral-600">{t.markupHint}</span><input name="markup" inputMode="decimal" defaultValue={Number(v.media_markup_pct)} className={input} /></label>
        <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" name="employerVisible" defaultChecked={v.employer_visible} className="h-5 w-5" /> {t.employerVisible}</label>
        <button type="submit" className="justify-self-start rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700">{t.save}</button>
      </form>
    </section>
  );
}
