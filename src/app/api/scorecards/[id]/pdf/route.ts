import { NextResponse, type NextRequest } from "next/server";
import { logRead } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";
import { loadScorecard } from "@/lib/scorecard/load";
import { scorecardPdf } from "@/lib/scorecard/pdf";
import { slugify } from "@/lib/jobs/format";
import { isUuid } from "@/lib/vacancies/paths";

/** Scorecard PDF for staff and for customers (shortlist only – enforced by RLS in loadScorecard). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isUuid(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const data = await loadScorecard(id);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  await logRead(session.userId, "scorecard_ratings", [id], "scorecard_pdf");
  const pdf = await scorecardPdf(data);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bewertungsbogen-${slugify(data.candidateName) || "kandidat"}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
