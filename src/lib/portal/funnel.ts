import type { Enums } from "@/lib/supabase/database.types";

// Funnel and cost per qualified candidate for the customer portal (F14) and KPIs.

export type Funnel = { applications: number; qualified: number; shortlisted: number; hired: number };

export type CostInput = {
  pricingModel: Enums<"pricing_model"> | null;
  priceEur: number | null;
  mediaMarkupPct: number;
  mediaSpendEur: number;
};

/**
 * What the customer pays for this vacancy so far. Fixed prices include media;
 * with media passthrough the spend plus markup is added. Raw media spend is
 * never shown on its own (it would reveal the margin).
 */
export function customerCost(c: CostInput): number | null {
  if (c.priceEur === null) return null;
  if (c.pricingModel === "service_fee_media_passthrough") return round2(c.priceEur + c.mediaSpendEur * (1 + c.mediaMarkupPct / 100));
  return round2(c.priceEur);
}

export function costPerQualified(cost: number | null, qualified: number): number | null {
  if (cost === null || qualified === 0) return null;
  return round2(cost / qualified);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
