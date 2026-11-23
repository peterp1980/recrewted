"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { parseInvite, isRole } from "@/lib/admin/invite";
import { requireAccess } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { isUuid } from "@/lib/vacancies/paths";
import { isMemberRole } from "@/lib/team/roles";
import { deleteAccount, sendLoginLink, setLocked, signOutEverywhere } from "@/lib/users/manage";

const PATH = "/admin/users";
function back(q: string): never {
  redirect(`${PATH}?${q}`);
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

// ---------------------------------------------------------------
// Managing a single user (admins only; /admin/users is admin-only in canAccess).
// ---------------------------------------------------------------

function userBack(id: string, s: string): never {
  redirect(`${PATH}/${id}?status=${s}`);
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function target(form: FormData) {
  const session = await requireAccess(PATH);
  const id = String(form.get("userId") ?? "");
  if (!isUuid(id)) back("status=error");
  return { session, id };
}

async function adminCount(): Promise<number> {
  const { count } = await createAdminClient().from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return count ?? 0;
}

export async function updateUser(form: FormData) {
  const { session, id } = await target(form);
  const fullName = String(form.get("fullName") ?? "").trim().replace(/\s+/g, " ");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = String(form.get("role") ?? "");
  if (fullName.length < 2 || fullName.length > 120 || !EMAIL_RE.test(email) || !isRole(role)) userBack(id, "invalid");
  const admin = createAdminClient();
  const { data: before } = await admin.from("profiles").select("role, full_name").eq("id", id).single();
  if (!before) userBack(id, "error");
  if (before.role === "admin" && role !== "admin") {
    if (id === session.userId) userBack(id, "selfDemote");
    if ((await adminCount()) <= 1) userBack(id, "lastAdmin");
  }
  const { data: authUser } = await admin.auth.admin.getUserById(id);
  if (authUser.user && authUser.user.email !== email) {
    const { error } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true });
    if (error) userBack(id, error.status === 422 ? "emailTaken" : "error");
  }
  const { error } = await admin.from("profiles").update({ full_name: fullName, role: role as "admin" | "recruiter" | "customer" }).eq("id", id);
  if (error) userBack(id, "error");
  // A staff account must not stay in a customer's team.
  if (role !== "customer") await admin.from("customer_members").delete().eq("profile_id", id);
  await audit(session.userId, "user_updated", "profiles", id, { role: { from: before.role, to: role }, emailChanged: authUser.user?.email !== email, nameChanged: before.full_name !== fullName });
  revalidatePath(PATH);
  userBack(id, "saved");
}

export async function addMembership(form: FormData) {
  const { session, id } = await target(form);
  const orgId = String(form.get("organizationId") ?? "");
  const memberRole = String(form.get("memberRole") ?? "");
  if (!isUuid(orgId) || !isMemberRole(memberRole)) userBack(id, "invalid");
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("role").eq("id", id).single();
  if (p?.role !== "customer") userBack(id, "staffAccount");
  const { error } = await admin.from("customer_members").insert({ organization_id: orgId, profile_id: id, member_role: memberRole, invited_by: session.userId });
  if (error) userBack(id, error.code === "23505" ? "memberExists" : "error");
  await audit(session.userId, "membership_added", "customer_members", id, { organization_id: orgId, member_role: memberRole });
  userBack(id, "saved");
}

export async function changeMembership(form: FormData) {
  const { session, id } = await target(form);
  const orgId = String(form.get("organizationId") ?? "");
  const memberRole = String(form.get("memberRole") ?? "");
  if (!isUuid(orgId) || !isMemberRole(memberRole)) userBack(id, "invalid");
  const { error } = await createAdminClient().from("customer_members").update({ member_role: memberRole }).eq("organization_id", orgId).eq("profile_id", id);
  if (error) userBack(id, error.message.includes("last_owner") ? "lastOwner" : "error");
  await audit(session.userId, "membership_changed", "customer_members", id, { organization_id: orgId, member_role: memberRole });
  userBack(id, "saved");
}

export async function removeMembership(form: FormData) {
  const { session, id } = await target(form);
  const orgId = String(form.get("organizationId") ?? "");
  if (!isUuid(orgId)) userBack(id, "invalid");
  const admin = createAdminClient();
  const { error } = await admin.from("customer_members").delete().eq("organization_id", orgId).eq("profile_id", id);
  if (error) userBack(id, error.message.includes("last_owner") ? "lastOwner" : "error");
  const { data: vacs } = await admin.from("vacancies").select("id").eq("organization_id", orgId);
  if (vacs?.length) await admin.from("vacancy_contacts").delete().eq("profile_id", id).in("vacancy_id", vacs.map((v) => v.id));
  await audit(session.userId, "membership_removed", "customer_members", id, { organization_id: orgId });
  userBack(id, "saved");
}

/** "Reset": end all sessions and send a fresh login link. */
export async function resetAccess(form: FormData) {
  const { session, id } = await target(form);
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(id);
  if (!data.user?.email) userBack(id, "error");
  await signOutEverywhere(id);
  const r = await sendLoginLink(data.user.email);
  await audit(session.userId, "access_reset", "profiles", id, { link: r });
  userBack(id, r === "sent" ? "reset" : r === "rate" ? "rate" : "resetNoMail");
}

export async function sendLink(form: FormData) {
  const { session, id } = await target(form);
  const { data } = await createAdminClient().auth.admin.getUserById(id);
  if (!data.user?.email) userBack(id, "error");
  const r = await sendLoginLink(data.user.email);
  await audit(session.userId, "login_link_sent", "profiles", id, { result: r });
  userBack(id, r === "sent" ? "linkSent" : r === "rate" ? "rate" : "error");
}

export async function signOutUser(form: FormData) {
  const { session, id } = await target(form);
  await signOutEverywhere(id);
  await audit(session.userId, "signed_out_everywhere", "profiles", id, {});
  userBack(id, "signedOut");
}

export async function lockUser(form: FormData) {
  const { session, id } = await target(form);
  const lock = form.get("lock") === "on";
  if (lock && id === session.userId) userBack(id, "self");
  if (lock) {
    const { data: p } = await createAdminClient().from("profiles").select("role").eq("id", id).single();
    if (p?.role === "admin" && (await adminCount()) <= 1) userBack(id, "lastAdmin");
  }
  await setLocked(id, lock);
  await audit(session.userId, lock ? "user_locked" : "user_unlocked", "profiles", id, {});
  revalidatePath(PATH);
  userBack(id, lock ? "locked" : "unlocked");
}

export async function deleteUser(form: FormData) {
  const { session, id } = await target(form);
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "LÖSCHEN") userBack(id, "confirm");
  if (id === session.userId) userBack(id, "self");
  const { data: p } = await createAdminClient().from("profiles").select("role, full_name").eq("id", id).single();
  if (p?.role === "admin" && (await adminCount()) <= 1) userBack(id, "lastAdmin");
  const r = await deleteAccount(id);
  if (r !== "deleted") userBack(id, r);
  await audit(session.userId, "user_deleted", "profiles", id, { role: p?.role ?? null });
  revalidatePath(PATH);
  back("status=deleted");
}
