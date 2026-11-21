"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { isStaff } from "@/lib/auth/roles";
import { getSession, type Session } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canManage, isMemberRole, parseColleague } from "@/lib/team/roles";
import { myRole } from "@/lib/team/server";
import { isUuid } from "@/lib/vacancies/paths";

// Customers manage their own team: owners invite colleagues, change roles and remove them.
// recrewted staff can do the same for any customer. Writes use the service role after these checks;
// the database keeps at least one owner (trigger keep_one_owner).

const page = (form: FormData, orgId: string, status: string) =>
  form.get("from") === "admin" ? `/admin/organizations/${orgId}?team=${status}#team` : `/portal/team?org=${orgId}&team=${status}#team`;

async function manager(orgId: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isUuid(orgId)) redirect("/");
  if (isStaff(session.role)) return session;
  if (!canManage(await myRole(session.userId, orgId))) redirect(`/portal/team?org=${orgId}&team=forbidden#team`);
  return session;
}

const refresh = (orgId: string) => {
  revalidatePath("/portal/team");
  revalidatePath(`/admin/organizations/${orgId}`);
};

export async function inviteColleague(form: FormData) {
  const orgId = String(form.get("organizationId") ?? "");
  const session = await manager(orgId);
  const parsed = parseColleague(form);
  if (!parsed.ok) redirect(page(form, orgId, parsed.error));
  const { email, fullName, role } = parsed.value;
  const admin = createAdminClient();

  let userId = (await admin.rpc("user_id_by_email", { addr: email })).data as string | null;
  if (userId) {
    // Existing account: only customer accounts can join a customer's team.
    const { data: prof } = await admin.from("profiles").select("role").eq("id", userId).single();
    if (prof?.role !== "customer") redirect(page(form, orgId, "staffAccount"));
  } else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName } });
    if (error || !data.user) redirect(page(form, orgId, "error"));
    userId = data.user.id;
    await admin.from("profiles").update({ full_name: fullName }).eq("id", userId);
  }
  const { error } = await admin.from("customer_members").insert({ organization_id: orgId, profile_id: userId, member_role: role, invited_by: session.userId });
  if (error) redirect(page(form, orgId, error.code === "23505" ? "exists" : "error"));
  await audit(session.userId, "invite_colleague", "customer_members", userId, { organization_id: orgId, member_role: role });
  refresh(orgId);
  redirect(page(form, orgId, "invited"));
}

export async function changeMemberRole(form: FormData) {
  const orgId = String(form.get("organizationId") ?? "");
  const session = await manager(orgId);
  const profileId = String(form.get("profileId") ?? "");
  const role = String(form.get("memberRole") ?? "");
  if (!isUuid(profileId) || !isMemberRole(role)) redirect(page(form, orgId, "error"));
  const { error } = await createAdminClient().from("customer_members").update({ member_role: role }).eq("organization_id", orgId).eq("profile_id", profileId);
  if (error) redirect(page(form, orgId, error.message.includes("last_owner") ? "lastOwner" : "error"));
  await audit(session.userId, "change_member_role", "customer_members", profileId, { organization_id: orgId, member_role: role });
  refresh(orgId);
  redirect(page(form, orgId, "saved"));
}

export async function removeMember(form: FormData) {
  const orgId = String(form.get("organizationId") ?? "");
  const session = await manager(orgId);
  const profileId = String(form.get("profileId") ?? "");
  if (!isUuid(profileId)) redirect(page(form, orgId, "error"));
  const admin = createAdminClient();
  const { error } = await admin.from("customer_members").delete().eq("organization_id", orgId).eq("profile_id", profileId);
  if (error) redirect(page(form, orgId, error.message.includes("last_owner") ? "lastOwner" : "error"));
  // No longer responsible for this customer's vacancies.
  const { data: vacs } = await admin.from("vacancies").select("id").eq("organization_id", orgId);
  if (vacs?.length) await admin.from("vacancy_contacts").delete().eq("profile_id", profileId).in("vacancy_id", vacs.map((v) => v.id));
  await audit(session.userId, "remove_member", "customer_members", profileId, { organization_id: orgId });
  refresh(orgId);
  redirect(page(form, orgId, "removed"));
}

/** Who is responsible for a vacancy (gets the shortlist mails). RLS: staff, owners and members. */
export async function setVacancyContacts(form: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const vacancyId = String(form.get("vacancyId") ?? "");
  if (!isUuid(vacancyId)) redirect("/");
  const base = isStaff(session.role) ? "/admin" : "/portal";
  const chosen = form.getAll("contact").map(String).filter(isUuid);
  const supabase = await createClient();
  const { data: current } = await supabase.from("vacancy_contacts").select("profile_id").eq("vacancy_id", vacancyId);
  const have = new Set((current ?? []).map((c) => c.profile_id));
  const remove = [...have].filter((id) => !chosen.includes(id));
  const add = chosen.filter((id) => !have.has(id));
  let failed = false;
  if (remove.length) failed ||= Boolean((await supabase.from("vacancy_contacts").delete().eq("vacancy_id", vacancyId).in("profile_id", remove)).error);
  if (add.length) failed ||= Boolean((await supabase.from("vacancy_contacts").insert(add.map((profile_id) => ({ vacancy_id: vacancyId, profile_id })))).error);
  revalidatePath(`${base}/vacancies/${vacancyId}`);
  redirect(`${base}/vacancies/${vacancyId}?ct=${failed ? "error" : "saved"}#zustaendig`);
}
