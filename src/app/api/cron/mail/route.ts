import { NextResponse, type NextRequest } from "next/server";
import { processDueMails } from "@/lib/mail/outbox";

// Daily Vercel cron (vercel.json) for delayed mails such as knockout rejections.
// Immediate mails are sent right after the application is stored.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await processDueMails(200);
  return NextResponse.json(result);
}
