import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOptOut, parseWebhook, validSignature } from "@/lib/whatsapp/webhook";

// Meta calls this for delivery states and replies. Env: WHATSAPP_VERIFY_TOKEN (setup handshake),
// WHATSAPP_APP_SECRET (signature of every delivery).

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (expected && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === expected) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  const raw = await request.text();
  if (!secret || !validSignature(raw, request.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { statuses, messages } = parseWebhook(body);
  const admin = createAdminClient();
  const rank = { sent: 1, delivered: 2, read: 3, failed: 4 } as const;

  for (const st of statuses) {
    const { data: row } = await admin.from("whatsapp_outbox").select("id, delivery").eq("wa_message_id", st.id).maybeSingle();
    // States can arrive out of order; never step back from "read" to "delivered".
    if (row && (rank[st.status] > (rank[row.delivery as keyof typeof rank] ?? 0))) {
      await admin.from("whatsapp_outbox").update({ delivery: st.status }).eq("id", row.id);
    }
  }
  for (const m of messages) {
    const { data: cand } = await admin.from("candidates").select("id").eq("whatsapp_phone", m.from).maybeSingle();
    await admin.from("whatsapp_inbound").upsert({ candidate_id: cand?.id ?? null, from_phone: m.from, body: m.text, wa_message_id: m.id }, { onConflict: "wa_message_id", ignoreDuplicates: true });
    if (cand && isOptOut(m.text)) {
      await admin.from("candidates").update({ whatsapp_opt_in_at: null }).eq("id", cand.id);
      await admin.from("whatsapp_outbox").update({ cancelled_at: new Date().toISOString() }).eq("candidate_id", cand.id).is("sent_at", null).is("cancelled_at", null);
      await admin.from("audit_log").insert({ action: "whatsapp_opt_out", table_name: "candidates", record_id: cand.id, details: { by: "data_subject" } });
    }
  }
  return NextResponse.json({ ok: true });
}
