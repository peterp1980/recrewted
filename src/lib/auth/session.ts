import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccess, type UserRole } from "./roles";

export type Session = {
  userId: string;
  email: string | null;
  role: UserRole;
  fullName: string | null;
};

/** The signed-in user with role, or null. Reads the profile through RLS. */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (!profile) return null;
  return { userId: user.id, email: user.email ?? null, role: profile.role, fullName: profile.full_name };
}

/** For pages and server actions: redirects to login if signed out, 404-like redirect if the role may not open `path`. */
export async function requireAccess(path: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!canAccess(session.role, path)) redirect("/");
  return session;
}
