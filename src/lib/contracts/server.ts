import "server-only";
import { audit } from "@/lib/audit";
import { fromStored } from "@/lib/briefing/schema";
import { getMessages } from "@/i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import { contractStatus, PandaDoc, PandaDocError, splitName, type DocStatus, type Recipient } from "./pandadoc";
import { buildTokens, KIND_LABEL } from "./tokens";

// F16: create, send and complete contracts. Called from admin actions and the PandaDoc webhook.

const VACANCY_KINDS = ["offer", "order_confirmation"];

function client(): PandaDoc {
  const key = process.env.PANDADOC_API_KEY;
  if (!key) throw new PandaDocError("PANDADOC_API_KEY fehlt", false);
  return new PandaDoc(key);
}

export type NewContract = {
  organizationId: string;
  vacancyId: string | null;
  kind: string;
  recipientName: string;
  recipientEmail: string;
  countersigner: { name: string; email: string } | null;
  send: boolean;
  message: string;
  actorId: string;
};

/** Creates the document from the active template; sends it right away if asked. Returns the contract id. */
export async function createContract(n: NewContract): Promise<string> {
  const admin = createAdminClient();
  const { data: tpl } = await admin.from("contract_templates").select("*").eq("kind", n.kind).eq("active", true).maybeSingle();
  if (!tpl) throw new PandaDocError(`Keine aktive Vorlage für „${KIND_LABEL[n.kind] ?? n.kind}“. Bitte unter Admin → Verträge hinterlegen.`, false);
  if (n.countersigner && !tpl.projx_role) throw new PandaDocError("Die Vorlage hat keine Rolle für projx – Gegenzeichnen ist damit nicht möglich.", false);

  const { data: org } = await admin.from("organizations").select("id, name, website").eq("id", n.organizationId).single();
  if (!org) throw new PandaDocError("Unternehmen nicht gefunden.", false);
  const { data: vac } = n.vacancyId
    ? await admin.from("vacancies").select("id, title, location, remote, openings, pricing_model, price_eur, media_markup_pct, organization_id, vacancy_briefings(data)").eq("id", n.vacancyId).single()
    : { data: null };
  if (n.vacancyId && (!vac || vac.organization_id !== org.id)) throw new PandaDocError("Vakanz gehört nicht zu diesem Unternehmen.", false);

  const briefing = vac ? fromStored((vac.vacancy_briefings as { data: unknown } | null)?.data) : null;
  const pricing = getMessages().settings.pricing as Record<string, string>;
  const { data: row, error } = await admin
    .from("contracts")
    .insert({
      organization_id: org.id, vacancy_id: vac?.id ?? null, kind: n.kind, template_version: `${tpl.name} v${tpl.version}`,
      name: `${KIND_LABEL[n.kind] ?? n.kind} – ${org.name}${vac ? ` – ${vac.title}` : ""}`.slice(0, 200),
      recipient_name: n.recipientName, recipient_email: n.recipientEmail, countersigner_email: n.countersigner?.email ?? null,
      amount_eur: vac?.price_eur ?? null, created_by: n.actorId,
    })
    .select("id, name")
    .single();
  if (error || !row) throw new Error(`contract insert failed: ${error?.message}`);

  const tokens = buildTokens({
    company: org.name, website: org.website, recipientName: n.recipientName, recipientEmail: n.recipientEmail,
    vacancy: vac ? { title: vac.title, location: vac.location, remote: vac.remote, openings: vac.openings, startDate: briefing?.startDate ?? null } : null,
    packageLabel: vac?.pricing_model ? (pricing[vac.pricing_model] ?? null) : null,
    price: vac?.price_eur === null || vac?.price_eur === undefined ? null : Number(vac.price_eur),
    mediaMarkupPct: vac ? Number(vac.media_markup_pct) : null, pricingModel: vac?.pricing_model ?? null,
    countersigner: n.countersigner?.name ?? null, contractId: row.id,
  });
  const recipients: Recipient[] = [{ email: n.recipientEmail, ...splitName(n.recipientName), role: tpl.customer_role, signing_order: 1 }];
  if (n.countersigner && tpl.projx_role) recipients.push({ email: n.countersigner.email, ...splitName(n.countersigner.name), role: tpl.projx_role, signing_order: 2 });

  try {
    const pd = client();
    const doc = await pd.createFromTemplate({ name: row.name ?? "recrewted", templateId: tpl.pandadoc_template_id, recipients, tokens, metadata: { contractId: row.id, organizationId: org.id, ...(vac ? { vacancyId: vac.id } : {}) } });
    await admin.from("contracts").update({ pandadoc_document_id: doc.id, tokens, updated_at: new Date().toISOString() }).eq("id", row.id);
    await audit(n.actorId, "contract_created", "contracts", row.id, { kind: n.kind, template: tpl.name, version: tpl.version });
    if (n.send) await sendContract(row.id, n.message, n.actorId, pd);
  } catch (e) {
    await admin.from("contracts").update({ error: String(e instanceof Error ? e.message : e).slice(0, 300), updated_at: new Date().toISOString() }).eq("id", row.id);
    throw e;
  }
  return row.id;
}

/** PandaDoc processes new documents for a few seconds; sending works once they are drafts. */
export async function sendContract(contractId: string, message: string, actorId: string, pd: PandaDoc = client()): Promise<boolean> {
  const admin = createAdminClient();
  const { data: c } = await admin.from("contracts").select("id, name, pandadoc_document_id, vacancy_id, kind, status").eq("id", contractId).single();
  if (!c?.pandadoc_document_id) throw new PandaDocError("Dokument wurde in PandaDoc noch nicht angelegt.", false);
  if (c.status !== "draft") return true;
  let status: DocStatus = "document.uploaded";
  for (let i = 0; i < 10 && status === "document.uploaded"; i++) {
    status = await pd.status(c.pandadoc_document_id);
    if (status === "document.uploaded") await new Promise((r) => setTimeout(r, 1000));
  }
  if (status !== "document.draft") {
    await admin.from("contracts").update({ error: "PandaDoc bereitet das Dokument noch vor. Bitte gleich „Senden“ erneut klicken.", updated_at: new Date().toISOString() }).eq("id", c.id);
    return false;
  }
  await pd.send(c.pandadoc_document_id, c.name ?? "Ihr Dokument von recrewted", message);
  const now = new Date().toISOString();
  await admin.from("contracts").update({ status: "sent", sent_at: now, error: null, updated_at: now }).eq("id", c.id);
  // The vacancy waits for the signature.
  if (c.vacancy_id && VACANCY_KINDS.includes(c.kind)) {
    await admin.from("vacancies").update({ status: "contract_pending" }).eq("id", c.vacancy_id).eq("status", "draft");
  }
  await audit(actorId, "contract_sent", "contracts", c.id, {});
  return true;
}

/** Applies a PandaDoc status (webhook or manual refresh). Completion stores the PDF and activates the vacancy. */
export async function applyDocumentStatus(documentId: string, docStatus: DocStatus, pd?: PandaDoc): Promise<"unknown" | "ignored" | "updated" | "completed"> {
  const admin = createAdminClient();
  const { data: c } = await admin.from("contracts").select("id, organization_id, vacancy_id, kind, status, storage_path, created_by").eq("pandadoc_document_id", documentId).maybeSingle();
  if (!c) return "unknown";
  const next = contractStatus(docStatus);
  if (!next || c.status === "completed" || (next === "draft" && c.status !== "draft")) return "ignored";
  const now = new Date().toISOString();
  if (next !== "completed") {
    await admin.from("contracts").update({
      status: next, updated_at: now,
      ...(next === "sent" ? { sent_at: now } : next === "viewed" ? { viewed_at: now } : next === "declined" ? { declined_at: now } : {}),
    }).eq("id", c.id);
    return "updated";
  }

  // Completed: signed PDF into the private bucket, then the vacancy goes live.
  const pdf = await (pd ?? client()).download(documentId);
  const path = `${c.organization_id}/${c.id}.pdf`;
  const up = await admin.storage.from("contracts").upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (up.error) throw new Error(`contract upload failed: ${up.error.message}`);
  await admin.from("contracts").update({ status: "completed", signed_at: now, storage_path: path, error: null, updated_at: now }).eq("id", c.id);
  if (c.vacancy_id && VACANCY_KINDS.includes(c.kind)) {
    const { error } = await admin.from("vacancies").update({ status: "active" }).eq("id", c.vacancy_id).in("status", ["draft", "contract_pending"]);
    if (error) await admin.from("contracts").update({ error: `Unterschrieben, aber die Vakanz konnte nicht aktiviert werden: ${error.message}`.slice(0, 300) }).eq("id", c.id);
  }
  await admin.from("audit_log").insert({ actor: c.created_by, action: "contract_completed", table_name: "contracts", record_id: c.id, details: { via: "pandadoc" } });
  return "completed";
}

/** Manual refresh, e.g. before the webhook is configured. */
export async function refreshContract(contractId: string): Promise<void> {
  const { data: c } = await createAdminClient().from("contracts").select("pandadoc_document_id").eq("id", contractId).single();
  if (!c?.pandadoc_document_id) return;
  const pd = client();
  await applyDocumentStatus(c.pandadoc_document_id, await pd.status(c.pandadoc_document_id), pd);
}
