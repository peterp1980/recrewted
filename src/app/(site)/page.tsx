import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BarChart3, Check, ChevronDown, ClipboardList, FileText, Megaphone, Quote, ShieldCheck, Smartphone, Sparkles, X } from "lucide-react";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site";

const t = site.home;
const stepin = site.cases.featured;
export const metadata: Metadata = { title: t.title, description: t.description, alternates: { canonical: `${siteUrl()}/` } };

const dots = (r: number) => (
  <span className="flex gap-1" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((i) => (
      <span key={i} className={`h-2 w-2 rounded-full ${i < r ? "bg-brand-500" : "bg-neutral-200"}`} />
    ))}
  </span>
);

/** Product illustration: shortlist with an opened scorecard. Example data, labelled as such. */
function ProductMockup() {
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
    <div aria-hidden="true" className="relative mx-auto w-full max-w-xl min-w-0">
      <div className="absolute -inset-px rounded-[1.6rem] bg-gradient-to-br from-brand-500/60 via-white/10 to-accent-500/60" />
      <div className="relative overflow-hidden rounded-3xl bg-white text-ink shadow-[0_40px_120px_-30px_rgb(29_192_209/0.45)]">
        <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-neutral-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-500/80" />
          <span className="ml-3 truncate text-xs text-muted">Kundenportal · Elektroniker (m/w/d), München</span>
          <span className="ml-auto rounded-full bg-neutral-200/70 px-2 py-0.5 text-[10px] font-medium text-muted">Beispieldaten</span>
        </div>
        <div className="grid sm:grid-cols-[0.8fr_1.2fr]">
          <div className="hidden border-r border-neutral-100 p-3 sm:block">
            <p className="px-2 pb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">Shortlist</p>
            <ul className="flex flex-col gap-1">
              {shortlist.map(([name, score, active]) => (
                <li key={name} className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-sm ${active ? "bg-brand-50 font-semibold text-brand-800 ring-1 ring-brand-100" : "text-ink/75"}`}>
                  {name}
                  <span className="tabular-nums">{score}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Bewertungsbogen</p>
                <p className="font-display text-lg font-bold">Kandidat:in A.</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 px-3 py-2 text-center text-white">
                <p className="font-display text-xl font-extrabold leading-none">4,3</p>
                <p className="text-[10px] text-white/80">von 5</p>
              </div>
            </div>
            <ul className="mt-4 flex flex-col gap-3">
              {rows.map(([name, r, why]) => (
                <li key={name}>
                  <div className="flex items-center justify-between gap-2 text-[13px] font-semibold">{name}{dots(r)}</div>
                  <p className="text-[11px] text-muted">{why}</p>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex gap-1.5">
              <span className="rounded-full bg-brand-700 px-3 py-1 text-[11px] font-semibold text-white">Passt</span>
              <span className="rounded-full border border-neutral-300 px-3 py-1 text-[11px] font-semibold">Gespräch</span>
              <span className="rounded-full border border-neutral-300 px-3 py-1 text-[11px] font-semibold">Absage</span>
            </div>
          </div>
        </div>
      </div>
      <div className="float-slow absolute -top-12 -left-6 hidden items-center gap-2.5 rounded-2xl border border-white/10 bg-night-800/90 px-4 py-3 text-white shadow-2xl backdrop-blur sm:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/20"><Smartphone className="h-4 w-4 text-brand-300" /></span>
        <span><span className="block text-[11px] text-white/70">Bewerbung</span><span className="text-sm font-semibold">in 2 Minuten</span></span>
      </div>
      <div className="float-slower absolute -right-5 -bottom-8 hidden max-w-[15rem] rounded-2xl border border-white/10 bg-night-800/90 px-4 py-3 text-white shadow-2xl backdrop-blur sm:block">
        <p className="text-[11px] text-white/70">Warum 5 von 5?</p>
        <p className="text-sm font-medium">„Gesellenbrief 2019, seitdem im Beruf“</p>
      </div>
    </div>
  );
}

/** Funnel from applications to hire; widths are illustrative, no real figures. */
function FunnelGraphic() {
  const steps = [
    ["Bewerbungen", "w-full", "bg-brand-300"],
    ["Vorqualifiziert", "w-[72%]", "bg-brand-500"],
    ["Shortlist", "w-[44%]", "bg-brand-700"],
    ["Einstellung", "w-[22%]", "bg-accent-500"],
  ] as const;
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      {steps.map(([label, w, c]) => (
        <div key={label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs text-white/70">{label}</span>
          <span className={`h-7 rounded-r-lg ${w} ${c}`} />
        </div>
      ))}
    </div>
  );
}

const logos = [site.cases.featured, ...site.cases.items];

export default function Home() {
  return (
    <main className="overflow-x-clip">
      {/* Hero – dark, runs underneath the floating header */}
      <section className="relative -mt-[76px] overflow-hidden bg-night pt-[76px] text-white">
        <div aria-hidden="true" className="hero-glow absolute inset-0" />
        <div aria-hidden="true" className="grid-lines absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-4 pt-16 pb-24 md:pt-24 lg:grid-cols-[1fr_1.05fr] lg:pb-32">
          <div className="flex min-w-0 flex-col gap-7">
            <p className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm font-medium text-white/85 backdrop-blur">
              <Sparkles className="h-4 w-4 text-brand-300" aria-hidden="true" /> Recruiting zum Festpreis
            </p>
            <h1 className="font-display text-[2.6rem] leading-[0.98] break-words hyphens-auto font-extrabold tracking-[-0.035em] sm:text-7xl">
              Vorqualifizierte
              <br />
              Kandidaten.
              <span className="text-gradient block pb-1">Zum Festpreis.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-white/70">{t.lead}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/kontakt" className="btn-light px-6 py-3.5 text-base">{t.ctaContact} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <Link href="/leistungen" className="btn-ghost-dark px-6 py-3.5 text-base">So arbeiten wir</Link>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
              {["Werbebudget inklusive", "Daten in Frankfurt", "Shortlist mit Begründung"].map((x) => (
                <li key={x} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-brand-300" aria-hidden="true" />{x}</li>
              ))}
            </ul>
          </div>
          <ProductMockup />
        </div>

        {/* Logo marquee */}
        <div className="relative border-t border-white/10 bg-white/[0.02]">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-9 md:flex-row md:gap-12">
            <p className="shrink-0 text-sm font-semibold tracking-widest text-white/70 uppercase">{t.trustLabel}</p>
            <div className="marquee w-full overflow-hidden">
              <ul className="marquee-track items-center gap-5">
                {[...logos, ...logos].map((c, i) => (
                  <li key={`${c.name}-${i}`} data-dup={i >= logos.length ? "" : undefined} aria-hidden={i >= logos.length ? true : undefined} className="shrink-0">
                    <Link href="/cases" tabIndex={i >= logos.length ? -1 : undefined} className="flex h-16 items-center rounded-2xl bg-white px-6 opacity-90 grayscale transition hover:opacity-100 hover:grayscale-0">
                      <Image src={c.logo} alt={c.name} width={240} height={84} className="h-9 w-auto max-w-[9rem] object-contain md:h-10" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Proof first: a real result, then two facts that hold by design */}
      <section aria-labelledby="proof-h" className="section reveal grid gap-4 md:grid-cols-3 md:grid-rows-2">
        <Link href="/cases" className="group relative isolate flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-3xl p-7 text-white md:col-span-2 md:row-span-2 md:p-10">
          <Image src="/cases/stepin-team.jpg" alt="" fill sizes="(min-width: 768px) 66vw, 100vw" className="-z-20 object-cover transition duration-700 group-hover:scale-[1.03]" />
          <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/70 to-night/10" />
          <span className="self-start rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-widest uppercase backdrop-blur">{stepin.eyebrow} · {stepin.name}</span>
          <h2 id="proof-h" className="mt-4 max-w-xl font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{stepin.headline}</h2>
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            {stepin.results.slice(0, 3).map((r) => (
              <div key={r.label}>
                <dt className="sr-only">{r.label}</dt>
                <dd><span className="block font-display text-3xl font-extrabold text-brand-300">{r.value}</span><span className="text-sm text-white/80">{r.label}</span></dd>
              </div>
            ))}
          </dl>
          <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 group-hover:text-white">Zur Erfolgsgeschichte <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
        </Link>
        {t.facts.slice(0, 2).map((f, i) => (
          <div key={f.value} className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-7">
            <span aria-hidden="true" className={`absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl ${i === 1 ? "bg-accent-500/20" : "bg-brand-500/20"}`} />
            <p className="font-display text-5xl font-extrabold tracking-tight">{f.value}</p>
            <p className="mt-3 max-w-xs text-ink/75">{f.label}</p>
          </div>
        ))}
      </section>

      {/* Bento: what we do */}
      <section aria-labelledby="leistungen-h" className="mx-auto max-w-6xl px-4 pb-24">
        <div className="reveal max-w-2xl">
          <p className="eyebrow">Was Sie bekommen</p>
          <h2 id="leistungen-h" className="section-title mt-3">Recruiting-Marketing und Vorauswahl aus einer Hand</h2>
        </div>
        <div className="reveal mt-12 grid auto-rows-[minmax(11rem,auto)] gap-4 md:grid-cols-3">
          <article className="relative overflow-hidden rounded-3xl bg-night p-7 text-white md:col-span-2 md:row-span-2">
            <div aria-hidden="true" className="hero-glow absolute inset-0 opacity-60" />
            <div className="relative flex h-full flex-col gap-6">
              <div>
                <BarChart3 className="h-6 w-6 text-brand-300" aria-hidden="true" />
                <h3 className="mt-4 font-display text-2xl font-bold">{site.services.items[5].title}</h3>
                <p className="mt-2 max-w-lg text-white/70">{site.services.items[5].text}</p>
              </div>
              <div className="mt-auto"><FunnelGraphic /></div>
            </div>
          </article>
          {[
            [ClipboardList, site.services.items[0]],
            [Megaphone, site.services.items[2]],
            [ShieldCheck, site.services.items[3]],
            [FileText, site.services.items[1]],
            [Sparkles, site.services.items[4]],
          ].map(([Icon, item], i) => {
            const I = Icon as typeof ClipboardList;
            const it = item as { title: string; text: string };
            return (
              <article key={it.title} className={`card-hover rounded-3xl border border-neutral-200 bg-white p-6 ${i === 2 ? "md:col-span-1" : ""}`}>
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${i % 2 ? "bg-accent-50 text-accent-700" : "bg-brand-50 text-brand-800"}`}><I className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="mt-4 font-display text-lg font-bold">{it.title}</h3>
                <p className="mt-1.5 text-[15px] text-ink/70">{it.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Process timeline */}
      <section aria-labelledby="ablauf" className="bg-white">
        <div className="section">
          <div className="reveal max-w-2xl">
            <p className="eyebrow">Ablauf</p>
            <h2 id="ablauf" className="section-title mt-3">Vom Briefing zur Shortlist</h2>
            <p className="mt-4 text-lg text-ink/70">Sie erklären uns einmal, wen Sie suchen. Danach bekommen Sie nur noch Kandidaten, die passen.</p>
          </div>
          <ol className="relative mt-16 grid gap-10 lg:grid-cols-4 lg:gap-6">
            <span aria-hidden="true" className="absolute top-6 right-[12%] left-[12%] hidden h-0.5 bg-gradient-to-r from-brand-500 via-brand-300 to-accent-500 lg:block" />
            <span aria-hidden="true" className="absolute top-2 bottom-2 left-6 w-0.5 bg-gradient-to-b from-brand-500 to-accent-500 lg:hidden" />
            {t.steps.map((s, i) => (
              <li key={s.title} className="reveal relative flex gap-5 lg:flex-col lg:items-center lg:text-center">
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-night font-display text-lg font-bold text-white ring-8 ring-white">{i + 1}</span>
                <div>
                  <h3 className="font-display text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-ink/70">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Comparison */}
      <section className="section">
        <div className="reveal mx-auto max-w-2xl text-center">
          <h2 className="section-title">{t.compare.title}</h2>
          <p className="mt-4 text-lg text-ink/70">{t.compare.lead}</p>
        </div>
        <div className="reveal mt-12 grid overflow-hidden rounded-3xl border border-neutral-200 md:grid-cols-2">
          <div className="bg-white p-8">
            <h3 className="text-sm font-semibold tracking-widest text-muted uppercase">{t.compare.before}</h3>
            <ul className="mt-6 flex flex-col gap-5">
              {t.compare.rows.map(([a]) => (
                <li key={a} className="flex gap-3 text-ink/60"><X className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" aria-hidden="true" />{a}</li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden bg-night p-8 text-white">
            <div aria-hidden="true" className="hero-glow absolute inset-0 opacity-50" />
            <h3 className="relative text-sm font-semibold tracking-widest text-brand-300 uppercase">{t.compare.after}</h3>
            <ul className="relative mt-6 flex flex-col gap-5">
              {t.compare.rows.map(([a, b]) => (
                <li key={a} className="flex gap-3 font-medium"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500"><Check className="h-3.5 w-3.5 text-night" aria-hidden="true" /></span>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Case teaser: Stepin */}
      <section aria-labelledby="case-h" className="mx-auto max-w-6xl px-4">
        <div className="reveal grid overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-neutral-200 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6 p-8 md:p-12">
            <Image src={stepin.logo} alt={stepin.name} width={240} height={80} className="h-9 w-auto self-start" />
            <h2 id="case-h" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Was Stepin über die Zusammenarbeit sagt</h2>
            <p className="text-lg leading-relaxed text-ink/75">{stepin.goal} {stepin.solution}</p>
            <Link href="/cases" className="btn-secondary self-start">Ganze Geschichte lesen <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <figure className="relative flex flex-col justify-end overflow-hidden bg-night p-8 text-white md:p-12">
            <div aria-hidden="true" className="hero-glow absolute inset-0 opacity-70" />
            <Quote className="relative h-10 w-10 text-accent-500" aria-hidden="true" />
            <blockquote className="relative mt-4 text-lg leading-relaxed text-white/90">„{stepin.quote.split("!")[0]}!“</blockquote>
            <figcaption className="relative mt-6 flex items-center gap-3">
              <Image src={stepin.quotePhoto} alt="" width={96} height={96} className="h-12 w-12 rounded-full object-cover ring-2 ring-white/20" />
              <span>
                <span className="block font-semibold">{stepin.quoteBy}</span>
                <span className="text-sm text-white/70">{stepin.quoteRole}</span>
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Portal */}
      <section className="section grid items-center gap-14 lg:grid-cols-2">
        <div className="reveal">
          <p className="eyebrow">Kundenportal</p>
          <h2 className="section-title mt-3">{t.portal.title}</h2>
          <p className="mt-4 text-lg text-ink/70">{t.portal.lead}</p>
          <ul className="mt-7 flex flex-col gap-3">
            {t.portal.points.map((p) => (
              <li key={p} className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50"><Check className="h-3.5 w-3.5 text-brand-800" aria-hidden="true" /></span>{p}</li>
            ))}
          </ul>
        </div>
        <div aria-hidden="true" className="reveal relative">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-100 via-white to-accent-100 blur-2xl" />
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="font-display font-bold">Elektroniker (m/w/d)</p>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">Kampagne läuft</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[["Bewerbungen", "48"], ["Passend", "11"], ["Shortlist", "5"]].map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-canvas p-3">
                  <p className="font-display text-2xl font-extrabold tabular-nums">{v}</p>
                  <p className="text-xs text-muted">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex h-28 items-end gap-2">
              {[30, 45, 38, 60, 52, 70, 64].map((h, i) => (
                <div key={i} className={`flex-1 rounded-t-lg ${i === 6 ? "bg-accent-500" : "bg-brand-300"}`} style={{ height: `${h}%` }} />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">Bewerbungen pro Tag · Beispieldaten</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-24 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="reveal">
          <p className="eyebrow">FAQ</p>
          <h2 className="section-title mt-3">Häufige Fragen</h2>
          <p className="mt-4 text-ink/70">Ihre Frage ist nicht dabei? <Link href="/kontakt" className="font-semibold text-brand-800 underline underline-offset-4">Schreiben Sie uns.</Link></p>
        </div>
        <div className="reveal flex flex-col gap-3">
          {t.faq.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-neutral-200 bg-white px-5 transition open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas transition group-open:rotate-180 group-open:bg-brand-50">
                  <ChevronDown className="h-4 w-4 text-brand-800" aria-hidden="true" />
                </span>
              </summary>
              <p className="pb-5 text-ink/70">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="reveal relative overflow-hidden rounded-[2rem] bg-night px-8 py-16 text-white md:px-16 md:py-20">
          <div aria-hidden="true" className="hero-glow absolute inset-0" />
          <div aria-hidden="true" className="grid-lines absolute inset-0" />
          <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Sie haben eine Stelle, die besetzt werden muss?</h2>
              <p className="mt-4 text-lg text-white/70">{t.promise}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/kontakt" className="btn-light px-6 py-3.5 text-base">{t.ctaContact} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <Link href="/jobs" className="btn-ghost-dark px-6 py-3.5 text-base">{t.ctaJobs}</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
