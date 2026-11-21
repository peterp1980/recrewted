import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { costPerQualified, customerCost, type Funnel } from "./funnel";

/**
 * Funnel counts include applications the customer may not see individually,
 * so they are counted with the service role – call only after the vacancy
 * itself was read through the user's session (RLS).
 */
export async function vacancyKpis(vacancyId: string): Promise<{ funnel: Funnel; cost: number | null; costPerQualified: number | null }> {
  const admin = createAdminClient();
  const [{ count: applications }, { data: qualifiedEvents }, { count: shortlisted }, { count: hired }, { data: v }, { data: camps }] = await Promise.all([
    admin.from("applications").select("id", { count: "exact", head: true }).eq("vacancy_id", vacancyId),
    admin.from("events").select("application_id").eq("vacancy_id", vacancyId).eq("name", "qualified"),
    admin.from("applications").select("id", { count: "exact", head: true }).eq("vacancy_id", vacancyId).not("shortlisted_at", "is", null),
    admin.from("applications").select("id", { count: "exact", head: true }).eq("vacancy_id", vacancyId).eq("status", "hired"),
    admin.from("vacancies").select("pricing_model, price_eur, media_markup_pct").eq("id", vacancyId).single(),
    admin.from("campaigns").select("id").eq("vacancy_id", vacancyId),
  ]);
  let mediaSpend = 0;
  if (camps?.length) {
    const { data: costs } = await admin.from("ad_costs").select("cost_eur").in("campaign_id", camps.map((c) => c.id));
    mediaSpend = (costs ?? []).reduce((s, c) => s + Number(c.cost_eur), 0);
  }
  // Everyone who reached "qualified" or beyond counts, even if later rejected.
  const qualified = new Set((qualifiedEvents ?? []).map((e) => e.application_id)).size;
  const funnel = { applications: applications ?? 0, qualified: Math.max(qualified, shortlisted ?? 0), shortlisted: shortlisted ?? 0, hired: hired ?? 0 };
  const cost = customerCost({
    pricingModel: v?.pricing_model ?? null,
    priceEur: v?.price_eur === null || v?.price_eur === undefined ? null : Number(v.price_eur),
    mediaMarkupPct: Number(v?.media_markup_pct ?? 0),
    mediaSpendEur: mediaSpend,
  });
  return { funnel, cost, costPerQualified: costPerQualified(cost, funnel.qualified) };
}
