import { NextResponse, type NextRequest } from "next/server";
import { processAtsTransfers } from "@/lib/ats/process";
import { processConversions } from "@/lib/conversions/process";
import { processDueMails } from "@/lib/mail/outbox";
import { createAdminClient } from "@/lib/supabase/admin";
import { queueJobAlerts } from "@/lib/profile/send-alerts";
import { isMondayInBerlin, queueWeeklyReports } from "@/lib/reports/send";

/**
 * Daily job (vercel.json): retention (F20), CV files of deleted applications,
 * unused CV uploads, job alerts, conversions (F12), delayed mails.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const result: Record<string, unknown> = {};

  const { data: retention, error } = await admin.rpc("run_retention", {});
  result.retention = error ? { error: error.message } : retention;
  const cvPaths = ((retention as { cv_paths?: string[] } | null)?.cv_paths ?? []).filter(Boolean);
  if (cvPaths.length) await admin.storage.from("cvs").remove(cvPaths);
  // Uploaded work samples of deleted applications (assessment, migration 0015).
  const uploadPaths = ((retention as { assessment_paths?: string[] } | null)?.assessment_paths ?? []).filter(Boolean);
  if (uploadPaths.length) await admin.storage.from("assessment-uploads").remove(uploadPaths);

  // "Still on it" mails for applications in review for 7 days (0019).
  const { data: reminders, error: remErr } = await admin.rpc("queue_pending_reminders", {});
  result.pendingReminders = remErr ? { error: remErr.message } : reminders;

  // Interview reminders for the next 12 to 36 hours (0024).
  const { data: interviewReminders, error: irErr } = await admin.rpc("queue_interview_reminders", {});
  result.interviewReminders = irErr ? { error: irErr.message } : interviewReminders;

  // Weekly report for customers, Mondays (0020).
  if (isMondayInBerlin()) {
    try {
      result.weeklyReports = await queueWeeklyReports();
    } catch (e) {
      result.weeklyReports = { error: e instanceof Error ? e.message : "failed" };
    }
  }

  // Job alerts for the talent pool (0018), queued before the mails are processed below.
  try {
    result.jobAlerts = await queueJobAlerts();
  } catch (e) {
    result.jobAlerts = { error: e instanceof Error ? e.message : "failed" };
  }

  // CV uploads that never became part of an application (older than a day).
  const { data: incoming } = await admin.storage.from("cvs").list("incoming", { limit: 1000 });
  const stale = (incoming ?? []).filter((f) => f.created_at && Date.parse(f.created_at) < Date.now() - 86_400_000).map((f) => `incoming/${f.name}`);
  if (stale.length) await admin.storage.from("cvs").remove(stale);
  result.cvFilesRemoved = cvPaths.length + stale.length;

  // Handovers to customers' ATS that failed temporarily or were queued without a live request (0022).
  result.ats = await processAtsTransfers(50).catch((e) => ({ error: String(e) }));
  result.conversions = await processConversions().catch((e) => ({ error: String(e) }));
  result.mails = await processDueMails(200).catch((e) => ({ error: String(e) }));
  // WhatsApp copies of candidate mails are sent inside processDueMails (only with opt-in and configured access).
  return NextResponse.json(result);
}
