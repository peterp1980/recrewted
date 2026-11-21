import { NextResponse, type NextRequest } from "next/server";
import { processConversions } from "@/lib/conversions/process";
import { processDueMails } from "@/lib/mail/outbox";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily job (vercel.json): retention (F20), CV files of deleted applications,
 * unused CV uploads, conversions (F12), delayed mails.
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

  // CV uploads that never became part of an application (older than a day).
  const { data: incoming } = await admin.storage.from("cvs").list("incoming", { limit: 1000 });
  const stale = (incoming ?? []).filter((f) => f.created_at && Date.parse(f.created_at) < Date.now() - 86_400_000).map((f) => `incoming/${f.name}`);
  if (stale.length) await admin.storage.from("cvs").remove(stale);
  result.cvFilesRemoved = cvPaths.length + stale.length;

  result.conversions = await processConversions().catch((e) => ({ error: String(e) }));
  result.mails = await processDueMails(200).catch((e) => ({ error: String(e) }));
  return NextResponse.json(result);
}
