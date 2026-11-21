import Link from "next/link";
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardCheck, Clock, Inbox, Megaphone, MessageCircleQuestion, Send, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const timeFmt = new Intl.DateTimeFormat("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const H = 3_600_000;
const ago = (h: number) => new Date(Date.now() - h * H).toISOString();

type Item = { key: string; icon: typeof Clock; title: string; hint: string; count: number; tone: "red" | "amber" | "blue"; links: { href: string; label: string }[] };

/**
 * Staff home: what needs attention today, with simple time limits (SLA).
 * Every number links to the place where it is handled.
 */
export async function RecruiterCockpit() {
  const supabase = await createClient();
  const name = (c: { first_name: string; last_name: string } | null | undefined) => (c ? `${c.first_name} ${c.last_name}` : "Bewerbung");
  const [unscreened, qualified, waitingFeedback, interviews, aiOpen, atsFailed, mailsFailed, oldAds, fbRequests] = await Promise.all([
    supabase.from("applications").select("id, submitted_at, candidates(first_name, last_name), vacancies(title)", { count: "exact" }).in("status", ["new", "screening"]).lt("submitted_at", ago(48)).order("submitted_at").limit(5),
    supabase.from("applications").select("id, candidates(first_name, last_name), vacancies(title), scorecard_ratings(criterion_id)", { count: "exact" }).eq("status", "qualified").order("submitted_at").limit(20),
    supabase.from("applications").select("id, shortlisted_at, candidates(first_name, last_name), vacancies(title), customer_feedback(id)").eq("status", "shortlisted").lt("shortlisted_at", ago(72)).order("shortlisted_at").limit(50),
    supabase.from("interview_bookings").select("application_id, interview_slots!inner(starts_at), applications(candidates(first_name, last_name), vacancies(title))").is("cancelled_at", null).gte("interview_slots.starts_at", new Date().toISOString()).lt("interview_slots.starts_at", new Date(Date.now() + 48 * H).toISOString()).limit(10),
    supabase.from("ai_recommendations").select("id, kind, application_id, vacancy_id", { count: "exact" }).eq("status", "suggested").lt("created_at", ago(24)).limit(5),
    supabase.from("ats_transfers").select("application_id, error", { count: "exact" }).eq("status", "failed").limit(5),
    supabase.from("mail_outbox").select("id, template, last_error", { count: "exact" }).is("sent_at", null).is("cancelled_at", null).not("last_error", "is", null).limit(5),
    supabase.from("vacancies").select("id, title, published_at", { count: "exact" }).eq("status", "active").lt("published_at", ago(24 * 30)).order("published_at").limit(5),
    supabase.from("feedback_requests").select("application_id, requested_at, applications(vacancies(title))", { count: "exact" }).is("answered_at", null).order("requested_at").limit(5),
  ]);

  const noFeedback = (waitingFeedback.data ?? []).filter((a) => !(a.customer_feedback ?? []).length);
  const qualifiedList = qualified.data ?? [];

  const items: Item[] = [
    {
      key: "unscreened", icon: Inbox, title: "Ungeprüfte Bewerbungen", hint: "älter als 48 Stunden – Ziel: innerhalb von 2 Tagen sichten", count: unscreened.count ?? 0, tone: "red",
      links: (unscreened.data ?? []).map((a) => ({ href: `/admin/applications/${a.id}`, label: `${name(a.candidates)} · ${a.vacancies?.title ?? ""}` })),
    },
    {
      key: "qualified", icon: ClipboardCheck, title: "Qualifiziert, aber noch nicht auf der Shortlist", hint: "Bewertungsbogen fertig machen und vorschlagen", count: qualified.count ?? 0, tone: "amber",
      links: qualifiedList.slice(0, 5).map((a) => ({ href: `/admin/applications/${a.id}#bewertung`, label: `${name(a.candidates)} · ${a.vacancies?.title ?? ""} · ${(a.scorecard_ratings ?? []).length} Bewertungen` })),
    },
    {
      key: "feedback", icon: Clock, title: "Kunde hat nicht reagiert", hint: "Shortlist ohne Rückmeldung seit mehr als 3 Tagen – Kunde erinnert automatisch, ggf. anrufen", count: noFeedback.length, tone: "amber",
      links: noFeedback.slice(0, 5).map((a) => ({ href: `/admin/applications/${a.id}`, label: `${name(a.candidates)} · ${a.vacancies?.title ?? ""}` })),
    },
    {
      key: "interviews", icon: CalendarDays, title: "Termine heute und morgen", hint: "Unterlagen bereitlegen, Leitfaden prüfen", count: (interviews.data ?? []).length, tone: "blue",
      links: (interviews.data ?? []).map((b) => ({ href: `/admin/applications/${b.application_id}`, label: `${timeFmt.format(new Date((b.interview_slots as unknown as { starts_at: string }).starts_at))} · ${name(b.applications?.candidates)} · ${b.applications?.vacancies?.title ?? ""}` })),
    },
    {
      key: "fb", icon: MessageCircleQuestion, title: "Kandidaten bitten um Begründung", hint: "nach einer Absage – innerhalb einer Woche antworten", count: fbRequests.count ?? 0, tone: "amber",
      links: (fbRequests.data ?? []).map((r) => ({ href: `/admin/applications/${r.application_id}#feedback-anfrage`, label: r.applications?.vacancies?.title ?? "Bewerbung" })),
    },
    {
      key: "ai", icon: Sparkles, title: "Offene KI-Vorschläge", hint: "älter als 24 Stunden – übernehmen oder verwerfen (Protokoll)", count: aiOpen.count ?? 0, tone: "blue",
      links: (aiOpen.data ?? []).map((r) => ({ href: r.application_id ? `/admin/applications/${r.application_id}#ki-bewertung` : `/admin/vacancies/${r.vacancy_id}#ki-kriterien`, label: r.kind })),
    },
    {
      key: "ats", icon: Send, title: "ATS-Übergaben fehlgeschlagen", hint: "Fehler ansehen, Zuordnung oder Key prüfen, erneut übergeben", count: atsFailed.count ?? 0, tone: "red",
      links: (atsFailed.data ?? []).map((t) => ({ href: `/admin/applications/${t.application_id}#ats`, label: (t.error ?? "Fehler").slice(0, 80) })),
    },
    {
      key: "mails", icon: AlertTriangle, title: "Mails mit Versandfehler", hint: "werden automatisch erneut versucht", count: mailsFailed.count ?? 0, tone: "red",
      links: (mailsFailed.data ?? []).map((m) => ({ href: "#", label: `${m.template}: ${(m.last_error ?? "").slice(0, 70)}` })),
    },
    {
      key: "ads", icon: Megaphone, title: "Anzeigen älter als 30 Tage", hint: "auffrischen (neuer Text, neue Bilder) oder Kampagne prüfen", count: oldAds.count ?? 0, tone: "blue",
      links: (oldAds.data ?? []).map((v) => ({ href: `/admin/vacancies/${v.id}#anzeigen`, label: v.title })),
    },
  ];
  const open = items.filter((i) => i.count > 0);
  const TONE = { red: "border-red-200 bg-red-50 text-red-900", amber: "border-amber-200 bg-amber-50 text-amber-900", blue: "border-sky-200 bg-sky-50 text-sky-900" };

  return (
    <section aria-labelledby="cockpit-h" className="flex flex-col gap-3">
      <h2 id="cockpit-h" className="text-xl font-semibold">Heute zu tun</h2>
      {open.length === 0 ? (
        <p className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Alles im grünen Bereich.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {open.map((i) => (
            <li key={i.key} className={`flex flex-col gap-2 rounded-2xl border p-4 ${TONE[i.tone]}`}>
              <p className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold"><i.icon className="h-5 w-5 shrink-0" aria-hidden="true" />{i.title}</span>
                <span className="font-display text-2xl font-extrabold tabular-nums">{i.count}</span>
              </p>
              <p className="text-xs opacity-80">{i.hint}</p>
              {i.links.length > 0 && (
                <ul className="flex flex-col gap-0.5 text-sm">
                  {i.links.map((l, n) => (
                    <li key={n} className="truncate">{l.href === "#" ? l.label : <Link href={l.href} className="underline underline-offset-2">{l.label}</Link>}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
