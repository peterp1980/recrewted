// Dates and calendar files for interviews. Always shown in German time.

export type SlotMode = "onsite" | "video" | "phone";
export const MODE_LABEL: Record<SlotMode, string> = { onsite: "vor Ort", video: "per Video", phone: "per Telefon" };
export const modeLabel = (m: unknown) => MODE_LABEL[(m as SlotMode)] ?? "";

const dayFmt = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Berlin" });
const timeFmt = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const dateKeyFmt = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Berlin" });

export const dayLabel = (iso: string) => dayFmt.format(new Date(iso));
export const timeLabel = (iso: string) => timeFmt.format(new Date(iso));
/** "Dienstag, 24. November, 10:00 Uhr" */
export const whenLabel = (iso: string) => `${dayLabel(iso)}, ${timeLabel(iso)} Uhr`;
export const dayKey = (iso: string) => dateKeyFmt.format(new Date(iso));

/** Groups slots by German calendar day, in order. */
export function byDay<T extends { starts_at: string }>(slots: T[]): { day: string; label: string; slots: T[] }[] {
  const out = new Map<string, { day: string; label: string; slots: T[] }>();
  for (const s of [...slots].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))) {
    const k = dayKey(s.starts_at);
    if (!out.has(k)) out.set(k, { day: k, label: dayLabel(s.starts_at), slots: [] });
    out.get(k)!.slots.push(s);
  }
  return [...out.values()];
}

/**
 * Local date + time in Germany (as typed in a form) to an absolute time. Handles summer/winter time
 * by asking Intl for the offset at that moment.
 */
export function berlinToUtc(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const guess = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(guess.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(guess);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asBerlin = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"));
  const offset = asBerlin - guess.getTime();
  return new Date(guess.getTime() - offset);
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Calendar file (RFC 5545) for one interview. */
export function icsFile(o: { uid: string; startsAt: string; minutes: number; title: string; location: string | null; description: string; cancelled?: boolean }): string {
  const start = new Date(o.startsAt);
  const end = new Date(start.getTime() + o.minutes * 60_000);
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//recrewted//Termine//DE", "CALSCALE:GREGORIAN", `METHOD:${o.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT", `UID:${o.uid}@recrewted.de`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(o.title)}`, ...(o.location ? [`LOCATION:${icsText(o.location)}`] : []), `DESCRIPTION:${icsText(o.description)}`,
    `STATUS:${o.cancelled ? "CANCELLED" : "CONFIRMED"}`, "END:VEVENT", "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

/** Slots of a series: count slots of `minutes` each, back to back (optional break in between). */
export function series(start: Date, minutes: number, count: number, gap = 0): Date[] {
  const n = Math.max(1, Math.min(20, Math.floor(count)));
  return Array.from({ length: n }, (_, i) => new Date(start.getTime() + i * (minutes + gap) * 60_000));
}
