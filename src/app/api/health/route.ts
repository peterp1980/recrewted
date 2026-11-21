import { NextResponse } from "next/server";
import { mailConfigured } from "@/lib/mail/send";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** F18: for uptime monitoring. Reports only whether parts work, no data. */
export async function GET() {
  let database = false;
  try {
    const { error } = await createAdminClient().from("vacancies").select("id", { head: true, count: "exact" }).limit(1);
    database = !error;
  } catch {
    database = false;
  }
  const body = { ok: database, database, mail: mailConfigured(), region: process.env.VERCEL_REGION ?? null };
  return NextResponse.json(body, { status: database ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
