import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildRequest, platformFor, sha256Email, type FunnelEvent } from "./platforms";

/**
 * Reports funnel events of the last 7 days that came from a paid click on a
 * recrewted ad account, with marketing consent. Each event/platform once.
 */
export async function processConversions(): Promise<Record<string, number>> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: events } = await admin
    .from("events")
    .select("id, name, event_id, occurred_at, application_id")
    .in("name", ["apply_submit", "qualified", "hired"])
    .gte("occurred_at", since)
    .not("application_id", "is", null)
    .limit(500);
  const counts: Record<string, number> = { sent: 0, failed: 0, not_configured: 0, skipped: 0 };
  for (const e of events ?? []) {
    const { data: att } = await admin
      .from("application_attribution")
      .select("click_id_type, click_id, marketing_consent, ad_account_owner, applications(candidates(email))")
      .eq("application_id", e.application_id!)
      .maybeSingle();
    if (!att?.marketing_consent || !att.click_id || !att.click_id_type || att.ad_account_owner === "customer") continue;
    const platform = platformFor(att.click_id_type);
    if (!platform) continue;
    const { count } = await admin.from("conversion_log").select("id", { count: "exact", head: true }).eq("event_id", e.id).eq("platform", platform);
    if (count) continue;

    const email = (att.applications as { candidates?: { email?: string | null } | null } | null)?.candidates?.email;
    const req = buildRequest(platform, {
      eventId: e.event_id ?? `${e.name}:${e.id}`, event: e.name as FunnelEvent, occurredAt: e.occurred_at,
      clickIdType: att.click_id_type, clickId: att.click_id, emailSha256: email ? sha256Email(email) : null,
    }, process.env);
    let status: "sent" | "failed" | "not_configured" = "not_configured";
    let detail: string | null = null;
    if (req) {
      const res = await fetch(req.url, req.init).catch((err) => ({ ok: false, status: 0, text: async () => String(err) }) as Response);
      status = res.ok ? "sent" : "failed";
      detail = res.ok ? null : `${res.status} ${(await res.text()).slice(0, 300)}`;
    }
    await admin.from("conversion_log").insert({ event_id: e.id, platform, status, detail });
    counts[status]++;
  }
  return counts;
}
