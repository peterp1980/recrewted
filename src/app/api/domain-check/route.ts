import { NextResponse, type NextRequest } from "next/server";
import { domainProof } from "@/lib/careers/domain-proof";

// Answers the domain check (see lib/careers/verify-domain.ts). Reveals nothing but a signature over host and nonce.
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const nonce = request.nextUrl.searchParams.get("nonce") ?? "";
  const host = (request.headers.get("host") ?? "").toLowerCase().replace(/:\d+$/, "");
  const secret = process.env.DATA_REQUEST_SECRET;
  if (!secret || !/^[\w-]{16,64}$/.test(nonce) || !host) return NextResponse.json({ error: "bad request" }, { status: 400 });
  return NextResponse.json({ proof: domainProof(host, nonce, secret) }, { headers: { "Cache-Control": "no-store" } });
}
