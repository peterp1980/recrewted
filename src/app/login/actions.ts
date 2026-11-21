"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends a magic link. Invite only: shouldCreateUser=false means unknown
 * addresses get no link. The response is the same either way, so the form
 * does not reveal which addresses have an account.
 */
export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) redirect("/login?error=email");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error?.status === 429) redirect("/login?error=rate");
  redirect("/login?sent=1");
}
