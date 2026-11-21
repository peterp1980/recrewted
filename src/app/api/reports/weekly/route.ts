import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { loadWeeklyReport } from "@/lib/reports/load";
import { weeklyReportPdf } from "@/lib/reports/pdf";
import { createClient } from "@/lib/supabase/server";

/** Weekly report as PDF for one customer. Staff and the customer's own users only (RLS on organizations). */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const org = request.nextUrl.searchParams.get("org") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(org)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { data } = await (await createClient()).from("organizations").select("id").eq("id", org).maybeSingle();
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  const report = await loadWeeklyReport(org);
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });
  const pdf = await weeklyReportPdf(report);
  return new NextResponse(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="wochenbericht.pdf"`, "Cache-Control": "private, no-store" },
  });
}
