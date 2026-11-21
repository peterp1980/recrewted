import { createHash } from "node:crypto";

// Server-side conversions (F12) to the platform that delivered the click.
// Sent: click ID, time, event name, event ID (dedup) and – with marketing
// consent – the SHA-256 hash of the e-mail. Nothing else.

export type Platform = "meta" | "google" | "tiktok" | "linkedin";
export type FunnelEvent = "apply_submit" | "qualified" | "hired";
export type ConversionInput = {
  eventId: string;
  event: FunnelEvent;
  occurredAt: string;
  clickIdType: string;
  clickId: string;
  emailSha256: string | null;
};
export type Env = Record<string, string | undefined>;

export function platformFor(clickIdType: string): Platform | null {
  if (clickIdType === "fbclid") return "meta";
  if (["gclid", "wbraid", "gbraid"].includes(clickIdType)) return "google";
  if (clickIdType === "ttclid") return "tiktok";
  if (clickIdType === "li_fat_id") return "linkedin";
  return null;
}

export const sha256Email = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

const META_NAMES: Record<FunnelEvent, string> = { apply_submit: "Lead", qualified: "QualifiedCandidate", hired: "Hired" };
const TIKTOK_NAMES: Record<FunnelEvent, string> = { apply_submit: "SubmitForm", qualified: "CompleteRegistration", hired: "PlaceAnOrder" };

/** Builds the HTTP request, or null if the platform is not configured. */
export function buildRequest(platform: Platform, c: ConversionInput, env: Env): { url: string; init: RequestInit } | null {
  const t = Math.floor(new Date(c.occurredAt).getTime() / 1000);
  switch (platform) {
    case "meta": {
      if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return null;
      return {
        url: `https://graph.facebook.com/v21.0/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`,
        init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          data: [{
            event_name: META_NAMES[c.event], event_time: t, event_id: c.eventId, action_source: "system_generated",
            user_data: { fbc: `fb.1.${t * 1000}.${c.clickId}`, ...(c.emailSha256 ? { em: [c.emailSha256] } : {}) },
          }],
        }) },
      };
    }
    case "tiktok": {
      if (!env.TIKTOK_PIXEL_ID || !env.TIKTOK_ACCESS_TOKEN) return null;
      return {
        url: "https://business-api.tiktok.com/open_api/v1.3/event/track/",
        init: { method: "POST", headers: { "Content-Type": "application/json", "Access-Token": env.TIKTOK_ACCESS_TOKEN }, body: JSON.stringify({
          event_source: "web", event_source_id: env.TIKTOK_PIXEL_ID,
          data: [{ event: TIKTOK_NAMES[c.event], event_time: t, event_id: c.eventId, user: { ttclid: c.clickId, ...(c.emailSha256 ? { email: c.emailSha256 } : {}) } }],
        }) },
      };
    }
    case "linkedin": {
      const rule = { apply_submit: env.LINKEDIN_CONVERSION_LEAD, qualified: env.LINKEDIN_CONVERSION_QUALIFIED, hired: env.LINKEDIN_CONVERSION_HIRED }[c.event];
      if (!env.LINKEDIN_ACCESS_TOKEN || !rule) return null;
      return {
        url: "https://api.linkedin.com/rest/conversionEvents",
        init: { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`, "LinkedIn-Version": "202410", "X-Restli-Protocol-Version": "2.0.0" }, body: JSON.stringify({
          conversion: `urn:lla:llaPartnerConversion:${rule}`, conversionHappenedAt: t * 1000, eventId: c.eventId,
          user: { userIds: [{ idType: "LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID", idValue: c.clickId }, ...(c.emailSha256 ? [{ idType: "SHA256_EMAIL", idValue: c.emailSha256 }] : [])] },
        }) },
      };
    }
    case "google": {
      // Offline conversion import via the Google Ads API (needs OAuth and a developer token).
      const action = { apply_submit: env.GOOGLE_ADS_ACTION_LEAD, qualified: env.GOOGLE_ADS_ACTION_QUALIFIED, hired: env.GOOGLE_ADS_ACTION_HIRED }[c.event];
      if (!env.GOOGLE_ADS_CUSTOMER_ID || !env.GOOGLE_ADS_DEVELOPER_TOKEN || !env.GOOGLE_ADS_ACCESS_TOKEN || !action) return null;
      const dt = new Date(c.occurredAt).toISOString().replace("T", " ").replace(/\.\d+Z$/, "+00:00");
      return {
        url: `https://googleads.googleapis.com/v18/customers/${env.GOOGLE_ADS_CUSTOMER_ID}:uploadClickConversions`,
        init: { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.GOOGLE_ADS_ACCESS_TOKEN}`, "developer-token": env.GOOGLE_ADS_DEVELOPER_TOKEN }, body: JSON.stringify({
          conversions: [{ [c.clickIdType]: c.clickId, conversionAction: action, conversionDateTime: dt, orderId: c.eventId,
            ...(c.emailSha256 ? { userIdentifiers: [{ hashedEmail: c.emailSha256 }] } : {}) }],
          partialFailure: true,
        }) },
      };
    }
  }
}
