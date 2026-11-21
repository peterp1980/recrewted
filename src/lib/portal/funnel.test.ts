import { describe, expect, it } from "vitest";
import { costPerQualified, customerCost } from "./funnel";

describe("customer cost", () => {
  it("uses the fixed price as is (media included)", () => {
    expect(customerCost({ pricingModel: "fixed_pro", priceEur: 4900, mediaMarkupPct: 0, mediaSpendEur: 1234.56 })).toBe(4900);
  });
  it("adds media with markup for passthrough", () => {
    expect(customerCost({ pricingModel: "service_fee_media_passthrough", priceEur: 1500, mediaMarkupPct: 15, mediaSpendEur: 1000 })).toBe(2650);
  });
  it("has no cost without an agreed price", () => {
    expect(customerCost({ pricingModel: null, priceEur: null, mediaMarkupPct: 0, mediaSpendEur: 10 })).toBeNull();
  });
  it("divides by qualified candidates", () => {
    expect(costPerQualified(4900, 7)).toBe(700);
    expect(costPerQualified(4900, 0)).toBeNull();
  });
});
