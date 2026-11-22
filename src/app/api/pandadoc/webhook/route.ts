import { after, NextResponse, type NextRequest } from "next/server";
import { applyDocumentStatus } from "@/lib/contracts/server";
import { webhookSignatureOk } from "@/lib/contracts/pandadoc";
import { processIndexing } from "@/lib/google/process";
import { processCrmOutbox } from "@/lib/crm/process";

// PandaDoc webhook (Settings → Integrations → Webhooks): URL https://<site>/api/pandadoc/webhook,
// event "document_state_changed", shared key in PANDADOC_WEBHOOK_KEY. Unsigned requests are refused.
export const dynamic = "force-dynamic";

type Event = { event?: string; data?: { id?: string; status?: string } };

export async function POST(request: NextRequest) {
  const key = process.env.PANDADOC_WEBHOOK_KEY;
  const raw = await request.text();
  if (!key || !webhookSignatureOk(raw, request.nextUrl.searchParams.get("signature"), key)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  let events: Event[] = [];
  try {
    const parsed = JSON.parse(raw) as Event | Event[];
    events = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const results: string[] = [];
  for (const e of events.slice(0, 50)) {
    if (e.event !== "document_state_changed" || !e.data?.id || !e.data.status) continue;
    try {
      results.push(await applyDocumentStatus(e.data.id, e.data.status));
    } catch (err) {
      console.error("pandadoc webhook failed", err);
      // 500 makes PandaDoc retry later (e.g. download not ready yet).
      return NextResponse.json({ error: "processing failed" }, { status: 500 });
    }
  }
  // A signed contract activates the vacancy: tell Google and Pipedrive now, not tomorrow.
  if (results.includes("completed")) after(() => Promise.all([processIndexing(5), processCrmOutbox(5)]).then(() => undefined).catch(() => undefined));
  return NextResponse.json({ ok: true, results });
}
