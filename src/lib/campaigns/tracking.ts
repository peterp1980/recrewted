import { slugify } from "@/lib/jobs/format";

// UTM tracking links for managed campaigns (F7). utm_campaign identifies the
// campaign, so applications can be attributed to it (F12).

export const PLATFORMS = ["meta", "google", "tiktok", "linkedin", "indeed", "stepstone", "ba", "other"] as const;
export type Platform = (typeof PLATFORMS)[number];

const MEDIUM: Record<Platform, string> = {
  meta: "paid_social",
  tiktok: "paid_social",
  linkedin: "paid_social",
  google: "cpc",
  indeed: "job_board",
  stepstone: "job_board",
  ba: "job_board",
  other: "paid",
};

/** e.g. "elektroniker-muenchen-3f2b1c4d" – readable and unique per campaign. */
export function utmCampaignFor(title: string, campaignId: string): string {
  return `${slugify(title).slice(0, 40)}-${campaignId.slice(0, 8)}`.replace(/^-/, "");
}

export function trackingLink(jobUrl: string, platform: Platform, utmCampaign: string, content?: string): string {
  const u = new URL(jobUrl);
  u.searchParams.set("utm_source", platform);
  u.searchParams.set("utm_medium", MEDIUM[platform]);
  u.searchParams.set("utm_campaign", utmCampaign);
  if (content) u.searchParams.set("utm_content", slugify(content).slice(0, 40));
  return u.toString();
}

export function campaignIdPrefix(utmCampaign: string | null | undefined): string | null {
  const m = utmCampaign?.match(/([0-9a-f]{8})$/);
  return m ? m[1] : null;
}
