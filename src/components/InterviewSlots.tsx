import { getMessages } from "@/i18n";
import { byDay, timeLabel } from "@/lib/booking/format";
import { createClient } from "@/lib/supabase/server";
import { cancelSlot, createSlots } from "@/app/booking-actions";
import { Notice } from "./Notice";

const field = "w-full rounded-lg border border-neutral-300 px-3 py-2";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" });

/** Free and booked interview slots of a vacancy; staff and the customer's owners/members add slots. */
export async function InterviewSlots({ vacancyId, canEdit, staff, status }: { vacancyId: string; canEdit: boolean; staff: boolean; status?: string }) {
  const t = getMessages().slots;
  const modes = getMessages().booking.modes;
  const supabase = await createClient();
  const { data: slots } = await supabase
    .from("interview_slots")
    .select("id, starts_at, duration_minutes, mode, location, interview_bookings(application_id, cancelled_at)")
    .eq("vacancy_id", vacancyId)
    .is("cancelled_at", null)
    .gt("starts_at", new Date(Date.now() - 3_600_000).toISOString())
    .order("starts_at")
    .limit(200);
  // Candidate names only where the viewer may see the application (RLS on applications).
  const bookedApps = (slots ?? []).flatMap((s) => (s.interview_bookings ?? []).filter((b) => !b.cancelled_at).map((b) => b.application_id));
  const { data: apps } = bookedApps.length ? await supabase.from("applications").select("id, candidates(first_name, last_name)").in("id", bookedApps) : { data: [] };
  const names = new Map((apps ?? []).map((a) => [a.id, a.candidates ? `${a.candidates.first_name} ${a.candidates.last_name}` : ""]));
  const base = staff ? "/admin" : "/portal";
  const tomorrow = dayFmt.format(new Date(Date.now() + 86_400_000));

  return (
    <section id="termine" aria-labelledby="slots-h" className="flex scroll-mt-20 flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="slots-h" className="text-xl font-semibold">{t.title}</h2>
      <p className="text-ink/80">{t.lead}</p>
      {status && t.notices[status] && <Notice kind={status === "created" || status === "cancelled" ? "ok" : "error"}>{t.notices[status]}</Notice>}

      {canEdit && (
        <form action={createSlots} className="grid gap-3 rounded-xl bg-neutral-50 p-3 sm:grid-cols-3">
          <input type="hidden" name="vacancyId" value={vacancyId} />
          <h3 className="font-semibold sm:col-span-3">{t.add}</h3>
          <label className="grid gap-1"><span className="text-sm font-medium">{t.date}</span><input type="date" name="date" required min={dayFmt.format(new Date())} defaultValue={tomorrow} className={field} /></label>
          <label className="grid gap-1"><span className="text-sm font-medium">{t.time}</span><input type="time" name="time" required step={300} defaultValue="10:00" className={field} /></label>
          <label className="grid gap-1"><span className="text-sm font-medium">{t.minutes}</span><input type="number" name="minutes" required min={10} max={480} step={5} defaultValue={30} className={field} /></label>
          <label className="grid gap-1"><span className="text-sm font-medium">{t.count}</span><input type="number" name="count" min={1} max={20} defaultValue={1} className={field} /></label>
          <label className="grid gap-1"><span className="text-sm font-medium">{t.gap}</span><input type="number" name="gap" min={0} max={240} step={5} defaultValue={0} className={field} /></label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">{t.mode}</span>
            <select name="mode" defaultValue="onsite" className={field}>{Object.entries(modes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
          <label className="grid gap-1 sm:col-span-3"><span className="text-sm font-medium">{t.location}</span><span className="text-xs text-muted">{t.locationHint}</span><input name="location" maxLength={500} className={field} /></label>
          <label className="grid gap-1 sm:col-span-3"><span className="text-sm font-medium">{t.note}</span><input name="note" maxLength={1000} placeholder="z. B. Bitte Führerschein und Fahrerkarte mitbringen." className={field} /></label>
          <button type="submit" className="justify-self-start rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800 sm:col-span-3">{t.create}</button>
        </form>
      )}

      <h3 className="font-semibold">{t.upcoming}</h3>
      {(slots ?? []).length === 0 ? (
        <p className="text-muted">{t.none}</p>
      ) : (
        byDay(slots ?? []).map((d) => (
          <div key={d.day} className="flex flex-col gap-1">
            <p className="text-sm font-medium">{d.label}</p>
            <ul className="flex flex-col divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {d.slots.map((s) => {
                const booking = (s.interview_bookings ?? []).find((b) => !b.cancelled_at);
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="tabular-nums">
                      {timeLabel(s.starts_at)} · {s.duration_minutes} Min. · {modes[s.mode]}
                      {s.location && <span className="text-muted"> · {s.location}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      {booking ? (
                        names.get(booking.application_id) ? <a href={`${base}/applications/${booking.application_id}`} className="font-medium underline">{names.get(booking.application_id)}</a> : <span className="font-medium">gebucht</span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">{t.free}</span>
                      )}
                      {canEdit && (
                        <form action={cancelSlot}>
                          <input type="hidden" name="vacancyId" value={vacancyId} />
                          <input type="hidden" name="slotId" value={s.id} />
                          <button type="submit" className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-red-50">{t.cancelSlot}</button>
                        </form>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
