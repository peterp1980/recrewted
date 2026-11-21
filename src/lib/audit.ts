import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { readEntries, type ApplicantDataTable } from "./audit-entry";

/**
 * Writes to audit_log with the service role; API roles have no insert right.
 * Changes to applicant data, ratings and contracts are logged by DB triggers
 * (migration 0003); this is for app events and for reads.
 */
export async function audit(actor: string, action: string, table: string, recordId: string | null, details: Json = {}) {
  const { error } = await createAdminClient().from("audit_log").insert({ actor, action, table_name: table, record_id: recordId, details });
  if (error) throw new Error(`audit_log insert failed: ${error.message}`);
}

/** Logs that `actor` has seen applicant records. Call it from every page that shows applicant data. */
export async function logRead(actor: string, table: ApplicantDataTable, recordIds: string[], view: string) {
  const rows = readEntries(actor, table, recordIds, view);
  if (rows.length === 0) return;
  const { error } = await createAdminClient().from("audit_log").insert(rows);
  if (error) throw new Error(`audit_log insert failed: ${error.message}`);
}
