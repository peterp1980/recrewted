import { NextResponse, type NextRequest } from "next/server";
import { icsFile } from "@/lib/booking/format";
import { loadBooking } from "@/lib/booking/load";
import { applicationFromBookingToken } from "@/lib/booking/server";

/** Calendar file for the candidate's booked interview. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const app = applicationFromBookingToken((await params).token);
  const data = app ? await loadBooking(app) : null;
  if (!data?.booking) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = data.booking;
  const body = icsFile({
    uid: b.id,
    startsAt: b.starts_at,
    minutes: b.duration_minutes,
    title: `Kennenlernen: ${data.jobTitle}${data.employer ? ` (${data.employer})` : ""}`,
    location: b.mode === "phone" ? "Telefon" : b.location,
    description: [b.mode === "phone" ? "Das Unternehmen ruft an." : null, b.note].filter(Boolean).join("\n"),
  });
  return new NextResponse(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="termin.ics"', "Cache-Control": "no-store" },
  });
}
