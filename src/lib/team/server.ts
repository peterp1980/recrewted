import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isMemberRole, type MemberRole } from "./roles";

/** The signed-in customer's organizations with their role in each (RLS: own memberships). */
export async function myOrganizations(userId: string): Promise<{ id: string; name: string; role: MemberRole }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("customer_members").select("organization_id, member_role, organizations(name)").eq("profile_id", userId);
  return (data ?? []).map((m) => ({ id: m.organization_id, name: m.organizations?.name ?? "", role: isMemberRole(m.member_role) ? m.member_role : "viewer" }));
}

/** Role of the signed-in customer in one organization, or null if not a member. */
export async function myRole(userId: string, organizationId: string): Promise<MemberRole | null> {
  return (await myOrganizations(userId)).find((o) => o.id === organizationId)?.role ?? null;
}
