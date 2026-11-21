import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/auth/roles";

const OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "invite", "recovery", "signup", "email_change"];

/**
 * Target of the links in login and invite e-mails (see supabase/templates).
 * Uses token_hash so the link works on any device, not only in the browser
 * that requested it. Falls back to the PKCE ?code= flow.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const fail = () => NextResponse.redirect(new URL("/login?error=link", request.url));

  const supabase = await createClient();
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail();
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail();
  } else {
    return fail();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return NextResponse.redirect(new URL(homeFor(profile?.role), request.url));
}
