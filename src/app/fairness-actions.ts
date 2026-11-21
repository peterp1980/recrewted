"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManage } from "@/lib/team/roles";
import { myRole } from "@/lib/team/server";
import { isUuid } from "@/lib/vacancies/paths";

/** Blind review on/off for a customer: recrewted staff or the customer's owners. */
export async function setBlindReview(form: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const orgId = String(form.get("organizationId") ?? "");
  if (!isUuid(orgId)) redirect("/");
  const staff = isStaff(session.role);
  if (!staff && !canManage(await myRole(session.userId, orgId))) redirect("/portal");
  const on = form.get("blindReview") === "on";
  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update({ blind_review: on }).eq("id", orgId);
  if (!error) await admin.from("audit_log").insert({ actor: session.userId, action: "blind_review", table_name: "organizations", record_id: orgId, details: { on } });
  revalidatePath(staff ? `/admin/organizations/${orgId}` : "/portal/team");
  redirect(staff ? `/admin/organizations/${orgId}?fair=${error ? "error" : "saved"}#fairness` : `/portal/team?org=${orgId}&fair=${error ? "error" : "saved"}#fairness`);
}
