import { processDueWhatsApp } from "@/lib/whatsapp/process";
import { withBookingLink } from "@/lib/booking/server";
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { MailError, mailConfigured, sendMail } from "./send";
import { renderMail, type MailData, type MailTemplate } from "./templates";

/** Sends due mails from the queue. Safe to call often: each mail is claimed once. */
export async function processDueMails(limit = 50): Promise<{ sent: number; failed: number; skipped: boolean }> {
  // WhatsApp copies go out on the same occasions, independent of the mail provider.
  await processDueWhatsApp(limit).catch((e) => console.error("whatsapp processing failed", e));
  if (!mailConfigured()) return { sent: 0, failed: 0, skipped: true };
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_due_mails", { max_count: limit });
  if (error) throw new Error(`claim_due_mails failed: ${error.message}`);

  let sent = 0;
  let failed = 0;
  for (const m of data ?? []) {
    try {
      const { subject, text } = renderMail(m.template as MailTemplate, withBookingLink(m.template, m.data as MailData));
      await sendMail(m.to_email, subject, text);
      await admin.from("mail_outbox").update({ sent_at: new Date().toISOString(), last_error: null }).eq("id", m.id);
      sent++;
    } catch (e) {
      // Sender domain not verified yet (DNS pending): a setup issue, not a problem of this mail.
      // Give the attempt back so the mail waits instead of running out of retries.
      const setupPending = e instanceof MailError && /not verified|domain/i.test(e.message) && !e.retry;
      await admin
        .from("mail_outbox")
        .update({ last_error: String(e).slice(0, 500), ...(setupPending ? { attempts: Math.max(0, (m.attempts ?? 1) - 1) } : {}) })
        .eq("id", m.id);
      failed++;
    }
  }
  return { sent, failed, skipped: false };
}
