import type { Metadata } from "next";
import { CalendarClock, FileSignature, MessageSquareText } from "lucide-react";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site";
import { sendContactRequest } from "@/lib/contact-actions";
import { Notice } from "@/components/Notice";
import { PageHero } from "@/components/PageHero";

const t = site.contact;
export const metadata: Metadata = { title: `${t.title} – recrewted`, description: t.lead, alternates: { canonical: `${siteUrl()}/kontakt` } };
const input = "w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-base";

// What happens after the request – the actual process (briefing, offer, start), no promises beyond it.
const NEXT = [
  [MessageSquareText, "Wir melden uns", "innerhalb eines Werktags und klären kurz, wen Sie suchen."],
  [FileSignature, "Briefing und Angebot", "Über ein geführtes Formular – danach nennen wir Ihnen den Festpreis."],
  [CalendarClock, "Start", "Anzeigen und Kampagne gehen raus, Sie bekommen die Shortlist im Portal."],
] as const;

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ s?: string; paket?: string }> }) {
  const { s, paket } = await searchParams;
  const pkg = site.packages.items.find((p) => p.name === paket)?.name;
  return (
    <main className="overflow-x-clip">
      <PageHero eyebrow="Gespräch vereinbaren" title={t.title} lead={t.lead} />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-16 lg:grid-cols-[0.8fr_1.2fr]">
        <section aria-labelledby="next-h" className="flex flex-col gap-6">
          <h2 id="next-h" className="font-display text-2xl font-bold">So geht es weiter</h2>
          <ol className="flex flex-col gap-5">
            {NEXT.map(([Icon, title, text], i) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-night text-brand-300"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <span><span className="block font-semibold">{i + 1}. {title}</span><span className="text-ink/70">{text}</span></span>
              </li>
            ))}
          </ol>
        </section>
        <div className="flex flex-col gap-4">
          {s === "sent" && <Notice kind="ok">{t.sent}</Notice>}
          {s === "invalid" && <Notice kind="error">{t.invalid}</Notice>}
          <form action={sendContactRequest} className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:p-8">
            <div aria-hidden="true" className="hidden"><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1"><span className="font-medium">{t.name}</span><input name="name" required autoComplete="name" className={input} /></label>
              <label className="grid gap-1"><span className="font-medium">{t.company}</span><input name="company" autoComplete="organization" className={input} /></label>
              <label className="grid gap-1"><span className="font-medium">{t.email}</span><input name="email" type="email" required autoComplete="email" className={input} /></label>
              <label className="grid gap-1"><span className="font-medium">{t.phone}</span><input name="phone" type="tel" autoComplete="tel" className={input} /></label>
            </div>
            <label className="grid gap-1"><span className="font-medium">{t.message}</span><textarea name="message" required rows={5} maxLength={3000} className={input} defaultValue={pkg ? `Wir interessieren uns für das Paket ${pkg}.\n\n` : undefined} /></label>
            <label className="flex items-start gap-3"><input type="checkbox" name="consent" required className="mt-1 h-5 w-5 shrink-0" /><span className="text-sm text-ink/70">{t.consent}</span></label>
            <button type="submit" className="btn-primary self-start px-6 py-3">{t.submit}</button>
          </form>
        </div>
      </div>
    </main>
  );
}
