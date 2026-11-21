import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Everything the candidate's booking page needs, read with the service role after the link was verified. */
export async function loadBooking(applicationId: string) {
  const admin = createAdminClient();
  const { data: app } = await admin
    .from("applications")
    .select("id, status, vacancy_id, candidates(first_name), vacancies(title, employer_visible, organizations(name, candidate_tone))")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app?.vacancies) return null;
  const [{ data: booking }, { data: slots }] = await Promise.all([
    admin.from("interview_bookings").select("id, slot_id, interview_slots(starts_at, duration_minutes, mode, location, note)").eq("application_id", applicationId).is("cancelled_at", null).maybeSingle(),
    admin.from("interview_slots").select("id, starts_at, duration_minutes, mode").eq("vacancy_id", app.vacancy_id).is("cancelled_at", null).gt("starts_at", new Date(Date.now() + 2 * 3_600_000).toISOString()).order("starts_at").limit(200),
  ]);
  const { data: taken } = slots?.length ? await admin.from("interview_bookings").select("slot_id").in("slot_id", slots.map((s) => s.id)).is("cancelled_at", null) : { data: [] };
  const takenIds = new Set((taken ?? []).map((t) => t.slot_id));
  const org = app.vacancies.organizations;
  return {
    applicationId,
    open: !["rejected", "withdrawn", "hired", "knockout_failed"].includes(app.status),
    firstName: app.candidates?.first_name ?? "",
    jobTitle: app.vacancies.title,
    employer: app.vacancies.employer_visible ? (org?.name ?? null) : null,
    du: org?.candidate_tone === "du",
    booking: booking?.interview_slots ? { id: booking.id, ...booking.interview_slots } : null,
    free: (slots ?? []).filter((s) => !takenIds.has(s.id)),
  };
}
