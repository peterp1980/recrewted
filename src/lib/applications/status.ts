import type { Enums } from "@/lib/supabase/database.types";

export type ApplicationStatus = Enums<"application_status">;

/** Statuses staff can set by hand. "new"/"knockout_failed" only come from the application itself. */
export const MANUAL_STATUSES: ApplicationStatus[] = ["screening", "qualified", "shortlisted", "interview", "hired", "rejected", "withdrawn"];

/** Order of the pipeline columns (F5). */
export const PIPELINE: ApplicationStatus[] = ["new", "screening", "qualified", "shortlisted", "interview", "hired", "rejected", "knockout_failed", "withdrawn"];

/** Statuses customers see (from the shortlist on). */
export const CUSTOMER_VISIBLE: ApplicationStatus[] = ["shortlisted", "interview", "hired", "rejected"];
