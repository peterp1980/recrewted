import { getMessages } from "@/i18n";
import { portalStatuses } from "@/lib/feeds/status";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

const COLOR = { online: "bg-emerald-50 text-emerald-900", offline: "bg-neutral-100 text-neutral-700", error: "bg-red-50 text-red-900", contract: "bg-amber-50 text-amber-900" };

/** Where the vacancy is live (F9). */
export async function DistributionSection({ vacancyId }: { vacancyId: string }) {
  const t = getMessages().distribution;
  const supabase = await createClient();
  const { data: v } = await supabase.from("vacancies").select("status, salary_min, salary_max").eq("id", vacancyId).single();
  if (!v) return null;
  const list = portalStatuses({ status: v.status, salaryMin: v.salary_min, salaryMax: v.salary_max });
  return (
    <section aria-labelledby="dist-h" className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4">
      <h2 id="dist-h" className="text-xl font-semibold">{t.title}</h2>
      <ul className="flex flex-wrap gap-2">
        {list.map((p) => (
          <li key={p.key} className={`rounded-md px-3 py-1 text-sm ${COLOR[p.state]}`}>
            {t.channels[p.key]}: {p.state === "contract" ? t.contract : t[p.state]}{p.reason ? ` (${t.reasons[p.reason]})` : ""}
          </li>
        ))}
      </ul>
      <p className="text-sm text-neutral-600">{t.feedUrl}: <code>{siteUrl()}/feeds/indeed.xml</code></p>
    </section>
  );
}
