import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, ChevronDown, X } from "lucide-react";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site";

const t = site.home;
export const metadata: Metadata = { title: t.title, description: t.description, alternates: { canonical: `${siteUrl()}/` } };

const dots = (r: number) => (
  <span className="flex gap-1" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((i) => (
      <span key={i} className={`h-2 w-2 rounded-full ${i < r ? "bg-brand-500" : "bg-neutral-200"}`} />
    ))}
  </span>
);

/** Product illustration: shortlist with an opened scorecard. Static example, no real data. */
function ProductPreview() {
  const shortlist = [
    ["Kandidat:in A.", "4,3", true],
    ["Kandidat:in B.", "4,0", false],
    ["Kandidat:in C.", "3,8", false],
  ] as const;
  const rows = [
    ["Ausbildung als Elektroniker", 5, "Gesellenbrief 2019, seitdem im Beruf"],
    ["Führerschein Klasse B", 4, "Vorhanden, eigenes Auto"],
    ["SPS-Kenntnisse", 3, "Grundlagen aus einem Projekt"],
  ] as const;
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-lg">
      <div className="brand-glow absolute -inset-10 -z-10 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/10">
        <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-neutral-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
          <span className="ml-3 text-xs text-muted">Kundenportal · Elektroniker (m/w/d), München</span>
        </div>
        <div className="grid sm:grid-cols-[0.8fr_1.2fr]">
          <div className="hidden border-r border-neutral-100 p-3 sm:block">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Shortlist</p>
            <ul className="flex flex-col gap-1">
              {shortlist.map(([name, score, active]) => (
                <li key={name} className={`flex items-center justify-between rounded-lg px-2 py-2 text-sm ${active ? "bg-brand-50 font-semibold text-brand-800" : "text-ink/80"}`}>
                  {name}<span className="tabular-nums">{score}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Bewertungsbogen</p>
                <p className="font-semibold">Kandidat:in A.</p>
              </div>
              <div className="rounded-xl bg-brand-700 px-2.5 py-1.5 text-center text-white">
                <p className="text-lg font-bold leading-none">4,3</p>
                <p className="text-[10px] text-white/80">von 5</p>
              </div>
            </div>
            <ul className="mt-3 flex flex-col gap-2.5">
              {rows.map(([name, r, why]) => (
                <li key={name}>
                  <div className="flex items-center justify-between gap-2 text-[13px] font-medium">{name}{dots(r)}</div>
                  <p className="text-[11px] text-muted">{why}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-1.5">
              <span className="rounded-md bg-brand-700 px-2.5 py-1 text-[11px] font-semibold text-white">Passt</span>
              <span className="rounded-md border border-neutral-300 px-2.5 py-1 text-[11px] font-semibold">Gespräch</span>
              <span className="rounded-md border border-neutral-300 px-2.5 py-1 text-[11px] font-semibold">Absage</span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -right-4 -bottom-10 hidden rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg sm:block">
        <p className="text-[11px] text-muted">Warum 5 von 5?</p>
        <p className="text-sm font-medium">„Gesellenbrief 2019, seitdem im Beruf“</p>
      </div>
    </div>
  );
}

/** Portal illustration: KPIs of one vacancy. Example values only. */
function PortalPreview() {
  const kpis = [["Bewerbungen", "48"], ["Passend", "11"], ["Shortlist", "5"]];
  const bars = [30, 45, 38, 60, 52, 70, 64];
  return (
    <div aria-hidden="true" className="card p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Elektroniker (m/w/d)</p>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">Kampagne läuft</span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {kpis.map(([l, v]) => (
          <div key={l} className="rounded-xl bg-canvas p-3">
            <p className="text-2xl font-bold tabular-nums">{v}</p>
            <p className="text-xs text-muted">{l}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex h-28 items-end gap-2">
        {bars.map((h, i) => (
          <div key={i} className={`flex-1 rounded-t-md ${i === bars.length - 1 ? "bg-accent-500" : "bg-brand-300"}`} style={{ height: `${h}%` }} />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">Bewerbungen pro Tag · Beispieldaten</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="overflow-x-clip">
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-16 px-4 pt-14 pb-20 md:pt-20 lg:grid-cols-[1fr_1.05fr] lg:pb-28">
        <div className="flex flex-col gap-7">
          <p className="inline-flex items-center gap-2 self-start rounded-full border border-accent-100 bg-white px-3 py-1 text-sm font-medium text-accent-700">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" /> Recruiting zum Festpreis
          </p>
          <h1 className="text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">
            Vorqualifizierte Kandidaten.
            <span className="block text-accent-500">Zum Festpreis.</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-ink/75">{t.lead}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/kontakt" className="btn-primary px-6 py-3.5 text-base">{t.ctaContact} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href="/leistungen" className="btn-secondary px-6 py-3.5 text-base">So arbeiten wir</Link>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/70">
            {["Werbebudget inklusive", "Daten in Frankfurt", "Shortlist mit Begründung"].map((x) => (
              <li key={x} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-brand-700" aria-hidden="true" />{x}</li>
            ))}
          </ul>
        </div>
        <ProductPreview />
      </section>

      {/* Trust */}
      <section className="border-y border-neutral-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-8 md:flex-row md:justify-between">
          <p className="text-sm text-muted md:max-w-56">{t.trustLabel}</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {site.cases.items.map((c) => (
              <li key={c.name} className="font-display text-xl font-bold tracking-tight text-neutral-400">{c.name}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Facts */}
      <section className="section reveal grid gap-10 md:grid-cols-3">
        {t.facts.map((f) => (
          <div key={f.value} className="border-t-2 border-ink pt-5">
            <p className="font-display text-5xl font-extrabold tracking-tight">{f.value}</p>
            <p className="mt-2 max-w-xs text-ink/75">{f.label}</p>
          </div>
        ))}
      </section>

      {/* Process */}
      <section aria-labelledby="ablauf" className="bg-white">
        <div className="section">
          <div className="reveal max-w-2xl">
            <p className="eyebrow">Ablauf</p>
            <h2 id="ablauf" className="section-title mt-3">Vom Briefing zur Shortlist</h2>
            <p className="mt-4 text-lg text-ink/75">Sie erklären uns einmal, wen Sie suchen. Danach bekommen Sie nur noch Kandidaten, die passen.</p>
          </div>
          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {t.steps.map((s, i) => (
              <li key={s.title} className="reveal relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-700 font-display font-bold text-white">{i + 1}</span>
                  {i < t.steps.length - 1 && <span aria-hidden="true" className="hidden h-px flex-1 bg-gradient-to-r from-brand-300 to-transparent lg:block" />}
                </div>
                <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-ink/75">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Comparison */}
      <section className="section">
        <div className="reveal mx-auto max-w-2xl text-center">
          <h2 className="section-title">{t.compare.title}</h2>
          <p className="mt-4 text-lg text-ink/75">{t.compare.lead}</p>
        </div>
        <div className="reveal mt-12 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white/60 p-7">
            <h3 className="font-semibold text-muted">{t.compare.before}</h3>
            <ul className="mt-5 flex flex-col gap-4">
              {t.compare.rows.map(([a]) => (
                <li key={a} className="flex gap-3 text-ink/70"><X className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" aria-hidden="true" />{a}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-brand-800 p-7 text-white shadow-xl">
            <h3 className="font-semibold text-brand-100">{t.compare.after}</h3>
            <ul className="mt-5 flex flex-col gap-4">
              {t.compare.rows.map(([a, b]) => (
                <li key={a} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" aria-hidden="true" />{b}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Portal */}
      <section className="bg-white">
        <div className="section grid items-center gap-14 lg:grid-cols-2">
          <div className="reveal">
            <p className="eyebrow">Kundenportal</p>
            <h2 className="section-title mt-3">{t.portal.title}</h2>
            <p className="mt-4 text-lg text-ink/75">{t.portal.lead}</p>
            <ul className="mt-6 flex flex-col gap-3">
              {t.portal.points.map((p) => (
                <li key={p} className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50"><Check className="h-3.5 w-3.5 text-brand-800" aria-hidden="true" /></span>{p}</li>
              ))}
            </ul>
          </div>
          <div className="reveal"><PortalPreview /></div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="reveal">
          <h2 className="section-title">Häufige Fragen</h2>
          <p className="mt-4 text-ink/75">Ihre Frage ist nicht dabei? <Link href="/kontakt" className="font-semibold text-brand-800 underline underline-offset-4">Schreiben Sie uns.</Link></p>
        </div>
        <div className="reveal divide-y divide-neutral-200 border-y border-neutral-200">
          {t.faq.map((f) => (
            <details key={f.q} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-brand-700 transition group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="pb-5 text-ink/75">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="reveal relative overflow-hidden rounded-3xl bg-ink px-8 py-14 text-white md:px-14">
          <div aria-hidden="true" className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-accent-500/25 blur-3xl" />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold sm:text-4xl">Sie haben eine Stelle, die besetzt werden muss?</h2>
              <p className="mt-3 text-lg text-white/75">{t.promise}</p>
            </div>
            <Link href="/kontakt" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-6 py-3.5 font-semibold text-ink transition hover:bg-brand-50">
              {t.ctaContact} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
