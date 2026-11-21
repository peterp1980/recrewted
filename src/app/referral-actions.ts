"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isStaff } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { newReferralCode } from "@/lib/referrals/code";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";

// Referral links: customers manage their own (RLS: org members), recrewted staff all of them.

const back = (form: FormData, orgId: string, status: string) => {
  const target = form.get("from") === "admin" ? `/admin/organizations/${orgId}` : `/portal/empfehlungen?org=${orgId}`;
  return `${target}${target.includes("?") ? "&" : "?"}r=${status}#empfehlungen`;
};

async function signedIn() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function createReferrer(form: FormData) {
  const session = await signedIn();
  const orgId = String(form.get("organizationId") ?? "");
  if (!isUuid(orgId)) redirect(isStaff(session.role) ? "/admin" : "/portal");
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120) redirect(back(form, orgId, "invalid"));
  const supabase = await createClient();
  let error = null;
  // A collision of two random codes is very unlikely; one retry covers it.
  for (let i = 0; i < 2; i++) {
    ({ error } = await supabase.from("referrers").insert({ organization_id: orgId, name, code: newReferralCode(), created_by: session.userId }));
    if (error?.code !== "23505") break;
  }
  revalidatePath("/portal/empfehlungen");
  revalidatePath(`/admin/organizations/${orgId}`);
  redirect(back(form, orgId, error ? "error" : "created"));
}

export async function setReferrerActive(form: FormData) {
  await signedIn();
  const orgId = String(form.get("organizationId") ?? "");
  const id = String(form.get("referrerId") ?? "");
  if (!isUuid(orgId) || !isUuid(id)) redirect("/");
  const supabase = await createClient();
  const { error } = await supabase.from("referrers").update({ active: form.get("active") === "1" }).eq("id", id).eq("organization_id", orgId);
  revalidatePath("/portal/empfehlungen");
  revalidatePath(`/admin/organizations/${orgId}`);
  redirect(back(form, orgId, error ? "error" : "saved"));
}
