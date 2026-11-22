import Link from "next/link";
import { getMessages } from "@/i18n";
import { loadChannelSettings } from "@/lib/feeds/settings";
import { channelStatuses, type ChannelState } from "@/lib/feeds/status";
import { createClient } from "@/lib/supabase/server";

const COLOR: Record<ChannelState, string> = {
  online: "bg-emerald-50 text-emerald-900",
  offline: "bg-neutral-100 text-ink/80",
  off: "bg-neutral-100 text-ink/60",
  customerOff: "bg-amber-50 text-amber-900",
  setup: "bg-neutral-100 text-ink/60",
};

/** Where the vacancy is live (F9), with the reason when a channel is not. */
export async function DistributionSection({ vacancyId }: { vacancyId: string }) {
  const t = getMessages().distribution;
  const supabase = await createClient();
  const { data: v } = await supabase.from("vacancies").select("status, organization_id").eq("id", vacancyId).single();
  if (!v) return null;
  const list = channelStatuses({ status: v.status, organizationId: v.organization_id }, await loadChannelSettings());
  return (
    <section aria-labelledby="dist-h" className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="dist-h" className="text-xl font-semibold">{t.title}</h2>
      <ul className="flex flex-wrap gap-2">
        {list.map((p) => (
          <li key={p.key} className={`rounded-lg px-3 py-1 text-sm ${COLOR[p.state]}`}>{p.name}: {t.states[p.state]}</li>
        ))}
      </ul>
      <p className="text-sm text-muted">{t.hint} <Link href="/admin/kanaele" className="underline">{t.manage}</Link> · <Link href={`/admin/organizations/${v.organization_id}#kanaele`} className="underline">{t.perCustomer}</Link></p>
    </section>
  );
}
