"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/roles";
import { audit } from "@/lib/audit";
import { processCrmOutbox } from "@/lib/crm/process";
import { CrmError, crmConfig, Pipedrive } from "@/lib/crm/pipedrive";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";

// F15: link a vacancy to a Pipedrive deal, or create the deal from the vacancy. Staff only.

async function staff(vacancyId: string) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) redirect("/login");
  if (!isUuid(vacancyId)) redirect("/admin");
  return { session, back: (s: string) => `/admin/vacancies/${vacancyId}?crm=${s}#crm` };
}

export async function linkDeal(form: FormData) {
  const vacancyId = String(form.get("vacancyId") ?? "");
  const { session, back } = await staff(vacancyId);
  const raw = String(form.get("dealId") ?? "").trim();
  // Accepts the number or a deal link (…/deal/123).
  const m = raw.match(/(?:deal\/)?(\d{1,12})\/?$/);
  const dealId = m ? Number(m[1]) : null;
  if (!dealId) redirect(back("invalid"));
  const config = crmConfig();
  if (config) {
    try {
      await new Pipedrive(config).getDeal(dealId);
    } catch (e) {
      redirect(back(e instanceof CrmError && !e.retry ? "notFound" : "unreachable"));
    }
  }
  const { error } = await (await createClient()).from("vacancies").update({ pipedrive_deal_id: dealId }).eq("id", vacancyId);
  if (error) redirect(back("error"));
  await audit(session.userId, "crm_deal_linked", "vacancies", vacancyId, { dealId });
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(back("linked"));
}

export async function unlinkDeal(form: FormData) {
  const vacancyId = String(form.get("vacancyId") ?? "");
  const { session, back } = await staff(vacancyId);
  await (await createClient()).from("vacancies").update({ pipedrive_deal_id: null }).eq("id", vacancyId);
  await audit(session.userId, "crm_deal_unlinked", "vacancies", vacancyId, {});
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(back("unlinked"));
}

/** New deal in the recrewted pipeline: organisation found or created by name, value = fixed price. */
export async function createDeal(form: FormData) {
  const vacancyId = String(form.get("vacancyId") ?? "");
  const { session, back } = await staff(vacancyId);
  const config = crmConfig();
  if (!config) redirect(back("notConfigured"));
  const admin = createAdminClient();
  const { data: v } = await admin.from("vacancies").select("id, title, price_eur, pipedrive_deal_id, organization_id, organizations(id, name, pipedrive_org_id)").eq("id", vacancyId).single();
  if (!v?.organizations) redirect(back("error"));
  if (v.pipedrive_deal_id) redirect(back("linked"));
  const pd = new Pipedrive(config);
  let dealId: number;
  try {
    const orgId = v.organizations.pipedrive_org_id ?? (await pd.findOrCreateOrganization(v.organizations.name));
    if (!v.organizations.pipedrive_org_id) await admin.from("organizations").update({ pipedrive_org_id: orgId }).eq("id", v.organizations.id);
    dealId = await pd.createDeal({ title: `${v.organizations.name} – ${v.title}`, orgId, value: v.price_eur === null ? null : Number(v.price_eur) });
  } catch (e) {
    console.error("pipedrive create deal failed", e);
    redirect(back(e instanceof CrmError && !e.retry ? "rejected" : "unreachable"));
  }
  await admin.from("vacancies").update({ pipedrive_deal_id: dealId }).eq("id", vacancyId);
  await audit(session.userId, "crm_deal_created", "vacancies", vacancyId, { dealId });
  revalidatePath(`/admin/vacancies/${vacancyId}`);
  redirect(back("created"));
}

/** Sends waiting entries again (after a token was added or Pipedrive was down). */
export async function retryCrm(form: FormData) {
  const vacancyId = String(form.get("vacancyId") ?? "");
  const { back } = await staff(vacancyId);
  await createAdminClient().from("crm_outbox").update({ status: "pending", attempts: 0 }).eq("vacancy_id", vacancyId).eq("status", "failed");
  after(() => processCrmOutbox(10).catch(() => undefined));
  redirect(back("retry"));
}
