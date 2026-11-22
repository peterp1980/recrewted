import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";
import { marksWon, statusNote } from "./notes";
import { CrmError, crmConfig, Pipedrive } from "./pipedrive";

// Works off the Pipedrive queue (0029): right after a change and in the daily cron.
// Without PIPEDRIVE_API_TOKEN nothing is claimed; entries wait until the token is set.

const MAX_ATTEMPTS = 5;

export async function processCrmOutbox(limit = 20, f: typeof fetch = fetch): Promise<{ sent: number; failed: number; retry: number } | { skipped: string }> {
  const config = crmConfig();
  if (!config) return { skipped: "PIPEDRIVE_API_TOKEN fehlt" };
  const pd = new Pipedrive(config, f);
  const admin = createAdminClient();
  const out = { sent: 0, failed: 0, retry: 0 };
  const { data: claimed, error } = await admin.rpc("claim_crm_outbox", { max_count: limit });
  if (error) throw new Error(`claim_crm_outbox failed: ${error.message}`);

  for (const e of claimed ?? []) {
    const finish = (patch: { status: string; error?: string | null; sent_at?: string }) => admin.from("crm_outbox").update({ error: null, ...patch }).eq("id", e.id);
    try {
      if (e.kind === "vacancy_status" && e.vacancy_id) {
        const { data: v } = await admin.from("vacancies").select("id, title, openings, pipedrive_deal_id, applications(status, shortlisted_at)").eq("id", e.vacancy_id).single();
        const p = e.payload as { from?: string; to?: string; dealId?: number };
        const dealId = v?.pipedrive_deal_id ?? p.dealId;
        if (!v || !dealId || !p.from || !p.to) {
          await finish({ status: "skipped", error: "Vakanz oder Deal nicht mehr vorhanden." });
          continue;
        }
        const apps = v.applications ?? [];
        await pd.addNote(Number(dealId), statusNote(p.from, p.to, {
          title: v.title,
          openings: v.openings,
          applications: apps.length,
          qualified: apps.filter((a) => ["qualified", "shortlisted", "interview", "hired"].includes(a.status)).length,
          shortlisted: apps.filter((a) => a.shortlisted_at).length,
          hired: apps.filter((a) => a.status === "hired").length,
          url: `${siteUrl()}/admin/vacancies/${v.id}`,
        }));
        if (marksWon(p.from, p.to)) await pd.markWon(Number(dealId));
      } else if (e.kind === "lead" && e.contact_request_id) {
        const { data: c } = await admin.from("contact_requests").select("id, name, email, phone, company, message, pipedrive_lead_id").eq("id", e.contact_request_id).single();
        if (!c) {
          await finish({ status: "skipped", error: "Anfrage nicht mehr vorhanden." });
          continue;
        }
        if (!c.pipedrive_lead_id) {
          const leadId = await pd.createLead(c);
          await admin.from("contact_requests").update({ pipedrive_lead_id: leadId }).eq("id", c.id);
        }
      }
      await finish({ status: "sent", sent_at: new Date().toISOString() });
      out.sent++;
    } catch (err) {
      const retry = err instanceof CrmError ? err.retry : true;
      const last = e.attempts >= MAX_ATTEMPTS;
      await finish({ status: retry && !last ? "pending" : "failed", error: String(err instanceof Error ? err.message : err).slice(0, 300) });
      if (retry && !last) out.retry++;
      else out.failed++;
    }
  }
  return out;
}
