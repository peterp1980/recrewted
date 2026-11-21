import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/privacy/token";
import { createAdminClient } from "@/lib/supabase/admin";

/** Machine-readable export of everything stored about the candidate (Art. 15/20 DSGVO). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const secret = process.env.DATA_REQUEST_SECRET;
  const id = secret ? verifyToken(token, secret) : null;
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 403 });
  const { data } = await createAdminClient().rpc("candidate_export", { cand: id });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="meine-daten-recrewted.json"', "Cache-Control": "private, no-store" },
  });
}
