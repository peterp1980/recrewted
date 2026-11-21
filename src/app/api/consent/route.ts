import { NextResponse, type NextRequest } from "next/server";
import { BANNER_VERSION } from "@/lib/tracking/consent";
import { createAdminClient } from "@/lib/supabase/admin";

/** Records a consent decision (F20). Only the random visitor ID, no personal data. */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || b.version !== BANNER_VERSION || typeof b.visitorId !== "string" || !/^[0-9a-f-]{36}$/.test(b.visitorId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await createAdminClient().from("consents").insert({
    subject_type: "visitor",
    subject_ref: b.visitorId,
    statistics: Boolean(b.statistics) || Boolean(b.marketing),
    marketing: Boolean(b.marketing),
    banner_version: BANNER_VERSION,
  });
  return NextResponse.json({ ok: true });
}
