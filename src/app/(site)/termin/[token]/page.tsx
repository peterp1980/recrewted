import type { Metadata } from "next";
import { getMessages } from "@/i18n";
import { Notice } from "@/components/Notice";
import { byDay, timeLabel, whenLabel } from "@/lib/booking/format";
import { loadBooking } from "@/lib/booking/load";
import { applicationFromBookingToken } from "@/lib/booking/server";
import { bookSlot, cancelOwnBooking } from "@/app/booking-actions";

export const metadata: Metadata = { title: "Termin – recrewted", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BookingPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ s?: string }> }) {
  const [{ token }, { s }] = await Promise.all([params, searchParams]);
  const t = getMessages().booking;
  const app = applicationFromBookingToken(token);
  const data = app ? await loadBooking(app) : null;
  if (!data) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
        <h1 className="text-2xl font-semibold">Termin</h1>
        <Notice kind="info">{t.expired}</Notice>
      </main>
    );
  }
  const { du, booking } = data;
  const changeable = booking ? Date.parse(booking.starts_at) > Date.now() + 24 * 3_600_000 : true;
  const days = byDay(data.free);
  const ok = s === "booked" || s === "cancelled";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">{t.title(data.jobTitle)}</h1>
        <p className="mt-2 text-ink/80">{data.firstName ? `Hallo ${data.firstName}, ` : ""}{t.lead(du, data.employer)}</p>
      </div>
      {s && t.notices[s] && <Notice kind={ok ? "ok" : "error"}>{t.notices[s]}</Notice>}

      {booking && (
        <section aria-labelledby="mine" className="hard-shadow-pink flex flex-col gap-3 border-2 border-ink bg-paper p-5">
          <h2 id="mine" className="text-lg font-semibold">{t.booked(du)}</h2>
          <p className="font-display text-2xl font-semibold"><span className="label mr-2 align-middle">Wann</span>{whenLabel(booking.starts_at)}</p>
          <p><span className="label mr-2">Dauer</span>{t.duration(booking.duration_minutes)}, {t.modes[booking.mode]}</p>
          <p><span className="label mr-2">Wo</span>{booking.mode === "phone" ? t.phone(du) : booking.location ?? "–"}</p>
          {booking.note && <p className="whitespace-pre-line text-sm text-ink/80">{booking.note}</p>}
          <div className="flex flex-wrap gap-2">
            <a href={`/termin/${token}/ics`} className="btn-secondary py-2">{t.calendar}</a>
            {changeable && (
              <form action={cancelOwnBooking}>
                <input type="hidden" name="token" value={token} />
                <button type="submit" className="rounded-lg border border-neutral-300 px-4 py-2 text-red-800 hover:bg-red-50">{t.cancel}</button>
              </form>
            )}
          </div>
          <p className="text-sm text-muted">{changeable ? t.rebookHint(du) : t.lockedHint(du)}</p>
        </section>
      )}

      {!data.open ? (
        <Notice kind="info">{t.closed(du)}</Notice>
      ) : (!booking || changeable) && (
        <section aria-labelledby="choose" className="flex flex-col gap-4">
          <h2 id="choose" className="text-lg font-semibold">{t.choose(du, Boolean(booking))}</h2>
          {days.length === 0 ? (
            <p className="text-muted">{t.none(du)}</p>
          ) : (
            days.map((d) => (
              <div key={d.day} className="flex flex-col gap-2">
                <h3 className="font-medium">{d.label}</h3>
                <div className="flex flex-wrap gap-2">
                  {d.slots.map((slot) => (
                    <form key={slot.id} action={bookSlot}>
                      <input type="hidden" name="token" value={token} />
                      <input type="hidden" name="slotId" value={slot.id} />
                      <button type="submit" className="border-2 border-ink bg-paper px-4 py-2 font-semibold hover:bg-ink hover:text-paper" aria-label={`${t.book}: ${whenLabel(slot.starts_at)}, ${slot.duration_minutes} Minuten, ${t.modes[slot.mode]}`}>
                        {timeLabel(slot.starts_at)} <span className="text-sm font-normal text-muted">· {slot.duration_minutes} Min. · {t.modes[slot.mode]}</span>
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      )}
    </main>
  );
}
