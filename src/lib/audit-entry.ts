import type { Json } from "@/lib/supabase/database.types";

/** Tables whose reads count as access to applicant data (F19). */
export const APPLICANT_DATA_TABLES = ["candidates", "applications", "screening_answers", "scorecard_ratings", "customer_feedback"] as const;
export type ApplicantDataTable = (typeof APPLICANT_DATA_TABLES)[number];

export type AuditRow = { actor: string; action: string; table_name: string; record_id: string | null; details: Json };

/** One row per record read. `view` names the screen (e.g. "shortlist"), never personal content. */
export function readEntries(actor: string, table: ApplicantDataTable, recordIds: string[], view: string): AuditRow[] {
  return [...new Set(recordIds)].map((id) => ({ actor, action: "read", table_name: table, record_id: id, details: { view } }));
}
