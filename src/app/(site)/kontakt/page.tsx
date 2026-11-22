import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { site } from "@/content/site";
import { sendContactRequest } from "@/lib/contact-actions";
import { Notice } from "@/components/Notice";
import { PageHero } from "@/components/PageHero";

const t = site.contact;
export const metadata: Metadata = pageMeta({ title: `${t.title} – recrewted`, description: t.lead, path: "/kontakt" });
const input = "w-full border-2 border-ink/70 px-3.5 py-2.5 text-base";

// What happens after the request – the actual process (briefing, offer, start), no promises beyond it.
const NEXT = [
  ["Wir melden uns", "innerhalb eines Werktags und klären kurz, wen Sie suchen."],
  ["Briefing und Angebot", "Über ein geführtes Formular – danach nennen wir Ihnen den Festpreis."],
  ["Start", "Anzeigen und Kampagne gehen raus, Sie bekommen die Shortlist im Portal."],
] as const;

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ s?: string; paket?: string }> }) {
  const { s, paket } = await searchParams;
  const pkg = site.packages.items.find((p) => p.name === paket)?.name;
  return (
    <main className="overflow-x-clip">
      <PageHero eyebrow="Gespräch vereinbaren" title={t.title} lead={t.lead} />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-16 lg:grid-cols-[0.8fr_1.2fr]">
        <section aria-labelledby="next-h" className="flex flex-col gap-6">
          <h2 id="next-h" className="font-display text-3xl font-semibold">So geht es weiter</h2>
          <ol className="border-t-2 border-ink">
            {NEXT.map(([title, text], i) => (
              <li key={title} className="grid grid-cols-[3rem_1fr] gap-2 border-b border-ink/25 py-5">
                <span className="font-display text-3xl font-semibold text-accent-500">{i + 1}</span>
                <span><span className="block text-lg font-semibold">{title}</span><span className="text-ink/80">{text}</span></span>
              </li>
            ))}
          </ol>
        </section>
        <div className="flex flex-col gap-4">
          {s === "sent" && <Notice kind="ok">{t.sent}</Notice>}
          {s === "invalid" && <Notice kind="error">{t.invalid}</Notice>}
          <form action={sendContactRequest} className="hard-shadow flex flex-col gap-4 border-2 border-ink bg-paper p-6 md:p-8">
            <div aria-hidden="true" className="hidden"><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1"><span className="label">{t.name}</span><input name="name" required autoComplete="name" className={input} /></label>
              <label className="grid gap-1"><span className="label">{t.company}</span><input name="company" autoComplete="organization" className={input} /></label>
              <label className="grid gap-1"><span className="label">{t.email}</span><input name="email" type="email" required autoComplete="email" className={input} /></label>
              <label className="grid gap-1"><span className="label">{t.phone}</span><input name="phone" type="tel" autoComplete="tel" className={input} /></label>
            </div>
            <label className="grid gap-1"><span className="label">{t.message}</span><textarea name="message" required rows={5} maxLength={3000} className={input} defaultValue={pkg ? `Wir interessieren uns für das Paket ${pkg}.\n\n` : undefined} /></label>
            <label className="flex items-start gap-3"><input type="checkbox" name="consent" required className="mt-1 h-5 w-5 shrink-0" /><span className="text-sm text-ink/80">{t.consent}</span></label>
            <button type="submit" className="btn-primary self-start px-6 py-3">{t.submit}</button>
          </form>
        </div>
      </div>
    </main>
  );
}
