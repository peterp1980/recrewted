import { getMessages } from "@/i18n";
import { aiConfig } from "@/lib/ai/config";
import { setAiSwitches } from "@/app/ai-actions";
import { Notice } from "./Notice";

/** Staff: per-customer AI switches on the organization page. */
export function AiSwitches({ organizationId, assist, scoring, status }: { organizationId: string; assist: boolean; scoring: boolean; status?: string }) {
  const t = getMessages().ai;
  return (
    <section id="ki" aria-labelledby="ki-h" className="card flex scroll-mt-20 flex-col gap-3">
      <h2 id="ki-h" className="text-lg font-semibold">{t.switches}</h2>
      {!aiConfig() && <Notice kind="info">{t.off}</Notice>}
      {status === "saved" && <Notice kind="ok">{getMessages().ai.notices.accepted}</Notice>}
      <form action={setAiSwitches} className="flex flex-col gap-2">
        <input type="hidden" name="organizationId" value={organizationId} />
        <label className="flex items-start gap-2"><input type="checkbox" name="aiAssist" defaultChecked={assist} className="mt-1" /> {t.switchAssist}</label>
        <label className="flex items-start gap-2"><input type="checkbox" name="aiScoring" defaultChecked={scoring} className="mt-1" /> {t.switchScoring}</label>
        <button type="submit" className="self-start rounded-lg border border-neutral-300 px-4 py-2 hover:bg-brand-50">{t.switchSave}</button>
      </form>
      <p className="text-sm text-muted"><a href="/admin/ki" className="underline">KI-Register und Überwachung</a></p>
    </section>
  );
}
