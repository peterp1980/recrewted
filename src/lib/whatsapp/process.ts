import { withBookingLink } from "@/lib/booking/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplate, whatsappConfig } from "./send";
import { waTemplate } from "./templates";

// Sends queued WhatsApp messages (mirrored from candidate mails, 0024). Without configuration nothing
// happens: the e-mail is the fallback and always goes out.

export async function processDueWhatsApp(limit = 50): Promise<{ sent: number; failed: number; skipped: boolean }> {
  const cfg = whatsappConfig();
  if (!cfg) return { sent: 0, failed: 0, skipped: true };
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_due_whatsapp", { max_count: limit });
  if (error) throw new Error(`claim_due_whatsapp failed: ${error.message}`);
  let sent = 0;
  let failed = 0;
  for (const m of data ?? []) {
    const tpl = waTemplate(m.template, withBookingLink(m.template, (m.params ?? {}) as Record<string, unknown> & { applicationId?: string }));
    if (!tpl) {
      await admin.from("whatsapp_outbox").update({ cancelled_at: new Date().toISOString(), last_error: "Keine WhatsApp-Vorlage für diese Nachricht." }).eq("id", m.id);
      continue;
    }
    const r = await sendTemplate(cfg, m.to_phone, tpl);
    if (r.ok) {
      await admin.from("whatsapp_outbox").update({ sent_at: new Date().toISOString(), wa_message_id: r.id, delivery: "sent", last_error: null }).eq("id", m.id);
      sent++;
    } else {
      // Permanent errors (template not approved, number not on WhatsApp) stop here; temporary ones retry up to 5 times.
      await admin.from("whatsapp_outbox").update({ last_error: r.error, ...(r.retry ? {} : { cancelled_at: new Date().toISOString(), delivery: "failed" }) }).eq("id", m.id);
      failed++;
    }
  }
  return { sent, failed, skipped: false };
}
