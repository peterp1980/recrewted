import { describe, expect, it } from "vitest";
import { campaignIdPrefix, trackingLink, utmCampaignFor } from "./tracking";

describe("tracking links", () => {
  const id = "3f2b1c4d-1234-4abc-8def-0123456789ab";
  it("builds a readable, unique utm_campaign", () => {
    expect(utmCampaignFor("Elektroniker (m/w/d) München", id)).toBe("elektroniker-muenchen-3f2b1c4d");
    expect(campaignIdPrefix("elektroniker-muenchen-3f2b1c4d")).toBe("3f2b1c4d");
    expect(campaignIdPrefix("newsletter")).toBeNull();
  });

  it("sets source, medium and campaign", () => {
    const link = trackingLink("https://recrewted.de/jobs/x--1", "meta", "job-3f2b1c4d", "Video Variante B");
    const u = new URL(link);
    expect(Object.fromEntries(u.searchParams)).toEqual({ utm_source: "meta", utm_medium: "paid_social", utm_campaign: "job-3f2b1c4d", utm_content: "video-variante-b" });
    expect(new URL(trackingLink("https://recrewted.de/jobs/x", "google", "c")).searchParams.get("utm_medium")).toBe("cpc");
  });
});
