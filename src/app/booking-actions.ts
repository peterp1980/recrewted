"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isStaff } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { berlinToUtc, series } from "@/lib/booking/format";
import { applicationFromBookingToken, bookingUrl } from "@/lib/booking/server";
import { processDueMails } from "@/lib/mail/outbox";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";

// Interview scheduling: the team creates slots and invites, candidates book via their personal link.

// Mails and their WhatsApp copies (processDueMails handles both).
const sendSoon = () => after(() => processDueMails(10).then(() => undefined).catch((e) => console.error("mail processing failed", e)));

const errCode = (m: string | undefined) =>
  m?.includes("slot_taken") ? "taken" : m?.includes("too_late") ? "late" : m?.includes("slot_unavailable") || m?.includes("not_bookable") ? "unavailable" : "error";

// --- Candidate side (personal link, no login) ---

export async function bookSlot(form: FormData) {
  const token = String(form.get("token") ?? "");
  const slotId = String(form.get("slotId") ?? "");
  const app = applicationFromBookingToken(token);
  if (!app || !isUuid(slotId)) redirect("/termin/ungueltig");
  const { error } = await createAdminClient().rpc("book_slot", { app, slot: slotId });
  if (!error) sendSoon();
  redirect(`/termin/${token}?s=${error ? errCode(error.message) : "booked"}`);
}

export async function cancelOwnBooking(form: FormData) {
  const token = String(form.get("token") ?? "");
  const app = applicationFromBookingToken(token);
  if (!app) redirect("/termin/ungueltig");
  const { error } = await createAdminClient().rpc("cancel_booking", { app, by_whom: "candidate" });
  if (!error) sendSoon();
  redirect(`/termin/${token}?s=${error ? errCode(error.message) : "cancelled"}`);
}

// --- Team side ---

async function team() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function createSlots(form: FormData) {
  const session = await team();
  const vacancyId = String(form.get("vacancyId") ?? "");
  if (!isUuid(vacancyId)) redirect("/");
  const base = isStaff(session.role) ? "/admin" : "/portal";
  const back = (s: string) => `${base}/vacancies/${vacancyId}?sl=${s}#termine`;
  const start = berlinToUtc(String(form.get("date") ?? ""), String(form.get("time") ?? ""));
  const minutes = Number(form.get("minutes"));
  const count = Number(form.get("count") || 1);
  const gap = Number(form.get("gap") || 0);
  const modeRaw = String(form.get("mode") ?? "onsite");
  const mode = modeRaw === "video" || modeRaw === "phone" ? modeRaw : "onsite";
  const location = String(form.get("location") ?? "").trim().slice(0, 500) || null;
  const note = String(form.get("note") ?? "").trim().slice(0, 1000) || null;
  if (!start || start.getTime() < Date.now() + 3_600_000 || !Number.isInteger(minutes) || minutes < 10 || minutes > 480 || !Number.isInteger(gap) || gap < 0 || gap > 240 || !Number.isInteger(count) || count < 1) {
    redirect(back("invalid"));
  }
  const rows = series(start, minutes, count, gap).map((d) => ({ vacancy_id: vacancyId, starts_at: d.toISOString(), duration_minutes: minutes, mode, location, note, created_by: session.userId }));
  // Through the user's session: RLS allows staff and the customer's owners/members.
  const { error } = await (await createClient()).from("interview_slots").insert(rows);
  revalidatePath(`${base}/vacancies/${vacancyId}`);
  redirect(back(error ? "error" : "created"));
}

export async function cancelSlot(form: FormData) {
  const session = await team();
  const vacancyId = String(form.get("vacancyId") ?? "");
  const slotId = String(form.get("slotId") ?? "");
  if (!isUuid(vacancyId) || !isUuid(slotId)) redirect("/");
  const base = isStaff(session.role) ? "/admin" : "/portal";
  const { error } = await (await createClient()).from("interview_slots").update({ cancelled_at: new Date().toISOString() }).eq("id", slotId).eq("vacancy_id", vacancyId);
  if (!error) sendSoon();
  revalidatePath(`${base}/vacancies/${vacancyId}`);
  redirect(`${base}/vacancies/${vacancyId}?sl=${error ? "error" : "cancelled"}#termine`);
}

/** Can the signed-in user act on this application? Staff always; customers if they see it (shortlist) and may edit. */
async function teamApplication(applicationId: string) {
  const session = await team();
  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("id, vacancy_id, candidate_id, candidates(email, first_name), vacancies(title, organization_id, employer_visible, organizations(name, candidate_tone))").eq("id", applicationId).maybeSingle();
  if (!app?.vacancies) redirect("/");
  if (!isStaff(session.role)) {
    const { data: role } = await supabase.from("customer_members").select("member_role").eq("organization_id", app.vacancies.organization_id).eq("profile_id", session.userId).maybeSingle();
    if (!role || role.member_role === "viewer") redirect(`/portal/applications/${applicationId}?bk=error#termin`);
  }
  return { session, app };
}

export async function inviteToBook(form: FormData) {
  const applicationId = String(form.get("applicationId") ?? "");
  if (!isUuid(applicationId)) redirect("/");
  const { session, app } = await teamApplication(applicationId);
  const base = isStaff(session.role) ? "/admin" : "/portal";
  const back = (s: string, extra = "") => `${base}/applications/${applicationId}?bk=${s}${extra}#termin`;
  const admin = createAdminClient();
  const { count } = await admin.from("interview_slots").select("id", { count: "exact", head: true }).eq("vacancy_id", app.vacancy_id).is("cancelled_at", null).gt("starts_at", new Date(Date.now() + 2 * 3_600_000).toISOString());
  if (!count) redirect(back("noSlots"));
  const link = bookingUrl(applicationId);
  if (!link) redirect(back("error"));
  if (!app.candidates?.email) redirect(back("noEmail"));
  const org = app.vacancies.organizations;
  const { error } = await admin.from("mail_outbox").insert({
    application_id: applicationId,
    candidate_id: app.candidate_id,
    to_email: app.candidates.email,
    template: "booking_invite",
    data: {
      firstName: app.candidates.first_name, jobTitle: app.vacancies.title, employer: app.vacancies.employer_visible ? (org?.name ?? null) : null,
      tone: org?.candidate_tone === "du" ? "du" : "sie", applicationId, invitedBy: session.userId, senderName: session.fullName,
    },
  });
  if (!error) sendSoon();
  revalidatePath(`${base}/applications/${applicationId}`);
  redirect(back(error ? "error" : "invited"));
}

export async function cancelBookingByTeam(form: FormData) {
  const applicationId = String(form.get("applicationId") ?? "");
  if (!isUuid(applicationId)) redirect("/");
  const { session } = await teamApplication(applicationId);
  const base = isStaff(session.role) ? "/admin" : "/portal";
  const { error } = await createAdminClient().rpc("cancel_booking", { app: applicationId, by_whom: "team" });
  if (!error) sendSoon();
  revalidatePath(`${base}/applications/${applicationId}`);
  redirect(`${base}/applications/${applicationId}?bk=${error ? "error" : "cancelled"}#termin`);
}
