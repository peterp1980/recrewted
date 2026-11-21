"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { parseInvite, isRole } from "@/lib/admin/invite";
import { requireAccess } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const PATH = "/admin/users";
function back(q: string): never {
  redirect(`${PATH}?${q}`);
}

async function audit(actor: string, action: string, table: string, recordId: string | null, details: Json) {
  // audit_log has no insert policy for API roles; it is written with the service role.
  await createAdminClient().from("audit_log").insert({ actor, action, table_name: table, record_id: recordId, details });
}

function adminClientOrNull() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/**
 * Invites a user by e-mail. auth.admin needs the service role; all table
 * writes go through the signed-in admin's session so RLS checks them too.
 */
export async function inviteUser(formData: FormData) {
  const session = await requireAccess(PATH);
  const parsed = parseInvite(formData);
  if (!parsed.ok) back(`error=${parsed.error}`);
  const input = parsed.value;

  const admin = adminClientOrNull();
  if (!admin) back("status=missingServiceKey");

  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, { data: { full_name: input.fullName } });
  if (error || !data.user) back(error?.code === "email_exists" || error?.status === 422 ? "status=exists" : "status=error");
  const userId = data.user.id;

  const supabase = await createClient();
  const { error: roleError } = await supabase.from("profiles").update({ role: input.role, full_name: input.fullName }).eq("id", userId);
  if (roleError) back("status=error");

  let organizationId = input.organizationId;
  if (input.role === "customer") {
    if (!organizationId) {
      const { data: org, error: orgError } = await supabase.from("organizations").insert({ name: input.newOrganizationName! }).select("id").single();
      if (orgError || !org) back("status=error");
      organizationId = org.id;
      await audit(session.userId, "create", "organizations", organizationId, { name: input.newOrganizationName });
    }
    const { error: memberError } = await supabase.from("customer_members").insert({ organization_id: organizationId, profile_id: userId });
    if (memberError) back("status=error");
  }

  await audit(session.userId, "invite", "profiles", userId, { role: input.role, organization_id: organizationId });
  revalidatePath(PATH);
  back("status=invited");
}

export async function changeRole(formData: FormData) {
  const session = await requireAccess(PATH);
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!isRole(role)) back("error=role");
  if (userId === session.userId && role !== "admin") back("status=selfDemote");

  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("role").eq("id", userId).single();
  const { error, count } = await supabase.from("profiles").update({ role }, { count: "exact" }).eq("id", userId);
  if (error || count !== 1) back("status=error");

  await audit(session.userId, "change_role", "profiles", userId, { from: before?.role ?? null, to: role });
  revalidatePath(PATH);
  back("status=roleChanged");
}
