import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardList, FileCheck2, Megaphone, Smartphone, ArrowRight } from "lucide-react";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site";

const t = site.home;
export const metadata: Metadata = { title: t.title, description: t.description, alternates: { canonical: `${siteUrl()}/` } };

const ICONS = [ClipboardList, Megaphone, Smartphone, FileCheck2];

/** Illustration of the product: an excerpt of a scorecard. Static, no real data. */
function ScorecardPreview() {
  const rows = [
    ["Ausbildung als Elektroniker", 5, "Gesellenbrief 2019, seitdem im Beruf"],
    ["Führerschein Klasse B", 4, "Vorhanden, eigenes Auto"],
    ["SPS-Kenntnisse", 3, "Grundlagen aus einem Projekt"],
  ] as const;
  return (
    <div aria-hidden="true" className="card relative mx-auto w-full max-w-md rotate-1 p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bewertungsbogen</p>
          <p className="text-lg font-semibold">Kandidat:in A.</p>
          <p className="text-sm text-muted">Elektroniker (m/w/d) · München</p>
        </div>
        <div className="rounded-xl bg-brand-50 px-3 py-2 text-center">
          <p className="text-2xl font-bold text-brand-800">4,3</p>
          <p className="text-[11px] text-muted">von 5</p>
        </div>
      </div>
      <ul className="mt-5 flex flex-col gap-3">
        {rows.map(([name, r, why]) => (
          <li key={name} className="rounded-xl border border-neutral-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{name}</span>
              <span className="text-sm tracking-widest text-brand-500">{"●".repeat(r)}<span className="text-neutral-200">{"●".repeat(5 - r)}</span></span>
            </div>
            <p className="mt-1 text-xs text-muted">{why}</p>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <span className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white">Passt</span>
        <span className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold">Gespräch vereinbart</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div className="flex flex-col gap-6">
          <p className="eyebrow">Recruiting zum Festpreis</p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Vorqualifizierte Kandidaten. <span className="text-accent-500">Zum Festpreis.</span>
          </h1>
          <p className="max-w-xl text-lg text-ink/80">{t.lead}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/kontakt" className="btn-primary px-6 py-3 text-base">{t.ctaContact} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href="/jobs" className="btn-secondary px-6 py-3 text-base">{t.ctaJobs}</Link>
          </div>
        </div>
        <ScorecardPreview />
      </section>

      <section aria-labelledby="ablauf" className="brand-gradient py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="ablauf" className="text-center text-3xl font-bold text-ink">So läuft es ab</h2>
          <ol className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {t.steps.map((s, i) => {
              const Icon = ICONS[i];
              return (
                <li key={s.title} className="card relative pt-10 text-center">
                  <span className="absolute -top-7 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-brand-500 text-white shadow-md">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Schritt {i + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-ink/80">{s.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-3">
        {[
          ["Zeit bis zur Shortlist", "Sie sehen, wie schnell die ersten passenden Kandidaten da sind."],
          ["Kosten pro qualifiziertem Kandidaten", "Was ein passender Kandidat kostet – laufend aktuell im Portal."],
          ["Besetzungsquote", "Wir messen bis zur Einstellung, nicht nur bis zum Klick."],
        ].map(([title, text]) => (
          <div key={title} className="border-l-4 border-accent-500 pl-4">
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-ink/80">{text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-start gap-5 rounded-3xl bg-ink px-8 py-10 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Sie haben eine Stelle, die besetzt werden muss?</h2>
            <p className="mt-2 text-white/80">{t.promise}</p>
          </div>
          <Link href="/kontakt" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-ink hover:bg-brand-300">{t.ctaContact}</Link>
        </div>
      </section>
    </main>
  );
}
