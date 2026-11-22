"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { PandaDocError } from "@/lib/contracts/pandadoc";
import { createContract, refreshContract, sendContract } from "@/lib/contracts/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";

// F16: only projx admins create, send and manage contracts and templates.

const KINDS = ["offer", "order_confirmation", "framework", "terms", "dpa"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function adminOnly(back: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect(`${back}${back.includes("?") ? "&" : "?"}vt=forbidden#vertraege`);
  return session;
}

/** Where to return: the vacancy or the organisation page. */
function backOf(form: FormData): string {
  const v = String(form.get("vacancyId") ?? "");
  const o = String(form.get("organizationId") ?? "");
  return isUuid(v) ? `/admin/vacancies/${v}` : isUuid(o) ? `/admin/organizations/${o}` : "/admin/vertraege";
}
const go = (back: string, s: string, detail?: string) =>
  redirect(`${back}?vt=${s}${detail ? `&vtd=${encodeURIComponent(detail.slice(0, 200))}` : ""}#vertraege`);

export async function createContractAction(form: FormData) {
  const back = backOf(form);
  const session = await adminOnly(back);
  const organizationId = String(form.get("organizationId") ?? "");
  const vacancyId = String(form.get("vacancyId") ?? "");
  const kind = String(form.get("kind") ?? "");
  const recipientName = String(form.get("recipientName") ?? "").trim().slice(0, 120);
  const recipientEmail = String(form.get("recipientEmail") ?? "").trim().toLowerCase().slice(0, 254);
  const countersign = form.get("countersign") === "on";
  const send = form.get("send") === "now";
  const message = String(form.get("message") ?? "").trim().slice(0, 1000);
  if (!isUuid(organizationId) || (vacancyId && !isUuid(vacancyId)) || !KINDS.includes(kind) || recipientName.length < 3 || !EMAIL.test(recipientEmail)) go(back, "invalid");
  if (countersign && !session.email) go(back, "invalid");
  let ok = true;
  try {
    ok = !!(await createContract({
      organizationId, vacancyId: vacancyId || null, kind, recipientName, recipientEmail,
      countersigner: countersign ? { name: session.fullName ?? session.email!, email: session.email! } : null,
      send, message: message || "Guten Tag, anbei unser Dokument zur Unterschrift. Bei Fragen antworten Sie einfach auf diese E-Mail. Viele Grüße, Ihr recrewted-Team",
      actorId: session.userId,
    }));
  } catch (e) {
    console.error("contract create failed", e);
    go(back, "error", e instanceof PandaDocError ? e.message : undefined);
  }
  revalidatePath(back);
  go(back, ok && send ? "sent" : "created");
}

export async function sendContractAction(form: FormData) {
  const back = backOf(form);
  const session = await adminOnly(back);
  const id = String(form.get("contractId") ?? "");
  if (!isUuid(id)) go(back, "invalid");
  let sent = false;
  try {
    sent = await sendContract(id, "Guten Tag, anbei unser Dokument zur Unterschrift. Viele Grüße, Ihr recrewted-Team", session.userId);
  } catch (e) {
    go(back, "error", e instanceof PandaDocError ? e.message : undefined);
  }
  revalidatePath(back);
  go(back, sent ? "sent" : "processing");
}

export async function refreshContractAction(form: FormData) {
  const back = backOf(form);
  await adminOnly(back);
  const id = String(form.get("contractId") ?? "");
  if (!isUuid(id)) go(back, "invalid");
  try {
    await refreshContract(id);
  } catch (e) {
    go(back, "error", e instanceof PandaDocError ? e.message : undefined);
  }
  revalidatePath(back);
  go(back, "refreshed");
}

/** New PandaDoc template for a kind; the previous active one of that kind is retired. */
export async function saveTemplateAction(form: FormData) {
  const session = await adminOnly("/admin/vertraege");
  const kind = String(form.get("kind") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  // Accepts the template id or a PandaDoc link containing it.
  const rawId = String(form.get("templateId") ?? "").trim();
  const templateId = rawId.match(/([A-Za-z0-9]{10,40})\/?(?:[?#].*)?$/)?.[1] ?? "";
  const customerRole = String(form.get("customerRole") ?? "").trim().slice(0, 60) || "Kunde";
  const projxRole = String(form.get("projxRole") ?? "").trim().slice(0, 60) || null;
  const version = String(form.get("version") ?? "").trim().slice(0, 30) || "1";
  if (!KINDS.includes(kind) || name.length < 2 || !templateId) redirect("/admin/vertraege?vt=invalid");
  const supabase = await createClient();
  await supabase.from("contract_templates").update({ active: false }).eq("kind", kind).eq("active", true);
  const { data, error } = await supabase.from("contract_templates").insert({ kind, name, pandadoc_template_id: templateId, customer_role: customerRole, projx_role: projxRole, version }).select("id").single();
  if (error || !data) redirect("/admin/vertraege?vt=error");
  await audit(session.userId, "contract_template_saved", "contract_templates", data.id, { kind, name, version });
  revalidatePath("/admin/vertraege");
  redirect("/admin/vertraege?vt=templateSaved");
}

export async function retireTemplateAction(form: FormData) {
  const session = await adminOnly("/admin/vertraege");
  const id = String(form.get("templateId") ?? "");
  if (!isUuid(id)) redirect("/admin/vertraege?vt=invalid");
  await (await createClient()).from("contract_templates").update({ active: false }).eq("id", id);
  await audit(session.userId, "contract_template_retired", "contract_templates", id, {});
  revalidatePath("/admin/vertraege");
  redirect("/admin/vertraege?vt=templateRetired");
}
