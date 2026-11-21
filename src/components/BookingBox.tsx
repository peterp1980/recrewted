import { getMessages } from "@/i18n";
import { whenLabel } from "@/lib/booking/format";
import { bookingUrl } from "@/lib/booking/server";
import { mailConfigured } from "@/lib/mail/send";
import { createClient } from "@/lib/supabase/server";
import { cancelBookingByTeam, inviteToBook } from "@/app/booking-actions";
import { Notice } from "./Notice";

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

/** On an application: booked interview, or invite the candidate to pick a slot. */
export async function BookingBox({ applicationId, canAct, status }: { applicationId: string; canAct: boolean; status?: string }) {
  const t = getMessages().slots.box;
  const modes = getMessages().booking.modes;
  const supabase = await createClient();
  const [{ data: booking }, { data: invites }] = await Promise.all([
    supabase.from("interview_bookings").select("interview_slots(starts_at, duration_minutes, mode, location)").eq("application_id", applicationId).is("cancelled_at", null).maybeSingle(),
    supabase.from("mail_outbox").select("created_at").eq("application_id", applicationId).eq("template", "booking_invite").order("created_at", { ascending: false }).limit(1),
  ]);
  const slot = booking?.interview_slots;
  const invitedAt = invites?.[0]?.created_at;
  // Without a mail provider the team sends the link by hand.
  const link = canAct && !mailConfigured() ? bookingUrl(applicationId) : null;

  return (
    <section id="termin" aria-labelledby="bk-h" className="flex scroll-mt-20 flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="bk-h" className="text-xl font-semibold">{t.title}</h2>
      {status && t.notices[status] && <Notice kind={status === "invited" || status === "cancelled" ? "ok" : "error"}>{t.notices[status]}</Notice>}
      {slot ? (
        <>
          <p><span className="font-medium">{t.booked}:</span> {whenLabel(slot.starts_at)} · {slot.duration_minutes} Min. · {modes[slot.mode]}{slot.location ? ` · ${slot.location}` : ""}</p>
          {canAct && (
            <form action={cancelBookingByTeam}>
              <input type="hidden" name="applicationId" value={applicationId} />
              <button type="submit" className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-red-800 hover:bg-red-50">{t.cancel}</button>
            </form>
          )}
        </>
      ) : (
        <>
          {invitedAt && <p className="text-sm text-muted">{t.invited(fmt.format(new Date(invitedAt)))}</p>}
          {canAct && (
            <form action={inviteToBook}>
              <input type="hidden" name="applicationId" value={applicationId} />
              <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">{invitedAt ? t.reinvite : t.invite}</button>
            </form>
          )}
        </>
      )}
      {link && (
        <label className="grid gap-1 text-sm">
          <span className="text-muted">{t.link}</span>
          <input readOnly value={link} className="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 font-mono text-xs" />
        </label>
      )}
    </section>
  );
}
