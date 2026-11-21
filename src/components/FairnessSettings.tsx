import { getMessages } from "@/i18n";
import { setBlindReview } from "@/app/fairness-actions";
import { Notice } from "./Notice";

/** Blind review switch, for staff (organization page) and customer owners (team page). */
export function FairnessSettings({ organizationId, blindReview, canChange, status }: { organizationId: string; blindReview: boolean; canChange: boolean; status?: string }) {
  const t = getMessages().fairness;
  return (
    <section id="fairness" aria-labelledby="fair-h" className="card flex scroll-mt-20 flex-col gap-3">
      <h2 id="fair-h" className="text-lg font-semibold">{t.title}</h2>
      <p className="max-w-3xl text-ink/80">{t.lead}</p>
      {status === "saved" && <Notice kind="ok">{t.saved}</Notice>}
      {status === "error" && <Notice kind="error">{t.error}</Notice>}
      <form action={setBlindReview} className="flex flex-col gap-2">
        <input type="hidden" name="organizationId" value={organizationId} />
        <label className="flex items-start gap-2"><input type="checkbox" name="blindReview" defaultChecked={blindReview} disabled={!canChange} className="mt-1" /> {t.blind}</label>
        {canChange && <button type="submit" className="self-start rounded-lg border border-neutral-300 px-4 py-2 hover:bg-brand-50">{t.save}</button>}
      </form>
      <p className="text-sm text-muted">{t.atsHint}</p>
    </section>
  );
}
