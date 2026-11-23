import "server-only";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

// Account operations for admins (any user) and customer owners (their own colleagues, checked by the caller).

export type AccountState = "active" | "invited" | "locked";

/** Sends a fresh login link (token link, works on any device). A plain client, so no cookie lands with the sender. */
export async function sendLoginLink(email: string): Promise<"sent" | "rate" | "error"> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return "error";
  const sb = createPlainClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error?.status === 429) return "rate";
  return error ? "error" : "sent";
}

export async function signOutEverywhere(userId: string): Promise<void> {
  const { error } = await createAdminClient().rpc("sign_out_everywhere", { uid: userId });
  if (error) throw new Error(`sign out failed: ${error.message}`);
}

/** Locks the account (no new sign-ins) and ends running sessions. */
export async function setLocked(userId: string, locked: boolean): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: locked ? "876000h" : "none" });
  if (error) throw new Error(`lock failed: ${error.message}`);
  if (locked) await signOutEverywhere(userId);
}

/** Deletes the account. Data the person created stays, with an empty reference (0034). */
export async function deleteAccount(userId: string): Promise<"deleted" | "lastOwner" | "error"> {
  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (!error) return "deleted";
  return /last_owner/.test(error.message) ? "lastOwner" : "error";
}

export function stateOf(u: { banned_until?: string | null; last_sign_in_at?: string | null; invited_at?: string | null }): AccountState {
  if (u.banned_until && new Date(u.banned_until).getTime() > Date.now()) return "locked";
  if (!u.last_sign_in_at) return "invited";
  return "active";
}
