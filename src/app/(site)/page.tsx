import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { faqJsonLd, organizationJsonLd, pageMeta, websiteJsonLd } from "@/lib/seo";
import { jsonLdScript } from "@/lib/jobs/format";
import { Arrow, Boxes, Circle, Clip, Cross, Plus, Tick, Underline } from "@/components/marks";
import { site } from "@/content/site";

const t = site.home;
const stepin = site.cases.featured;
export const metadata: Metadata = pageMeta({ title: t.title, description: t.description, path: "/" });

/** The product as a document: a scorecard on top of the shortlist. Example data, labelled as such. */
function ScorecardSheet() {
  const rows = [
    ["Ausbildung als Elektroniker", 5, "Gesellenbrief 2019, seitdem im Beruf"],
    ["Führerschein Klasse B", 4, "vorhanden, eigenes Auto"],
    ["SPS-Kenntnisse", 3, "Grundlagen aus einem Projekt"],
    ["Schichtbereitschaft", 5, "ausdrücklich ja"],
  ] as const;
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[34rem] min-w-0 pt-14 pr-4 pl-2">
      {/* Sheet behind: the shortlist */}
      <div className="absolute top-0 right-0 left-12 h-[70%] rotate-[3deg] border border-ink/50 bg-paper px-5 py-3">
        <p className="label">Shortlist · 3 von 48</p>
        <ul className="mt-3 space-y-1.5 font-mono text-xs text-ink/70">
          <li>01 Kandidat:in A. ........ 4,3</li>
          <li>02 Kandidat:in B. ........ 4,0</li>
          <li>03 Kandidat:in C. ........ 3,8</li>
        </ul>
      </div>
      {/* The scorecard */}
      <div className="hard-shadow ruled margin-line relative border-2 border-ink bg-paper pt-5 pr-5 pb-6 pl-[62px]">
        <Clip className="absolute -top-5 left-10 h-12 w-5 text-ink/70" />
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink pb-3">
          <div>
            <p className="label">Bewertungsbogen</p>
            <p className="mt-1 font-display text-2xl font-semibold leading-none">Kandidat:in A.</p>
            <p className="mt-1 font-mono text-[11px] text-muted">Elektroniker (m/w/d) · München</p>
          </div>
          <div className="border-2 border-ink px-3 py-1.5 text-center">
            <p className="font-display text-3xl font-bold leading-none">4,3</p>
            <p className="font-mono text-[10px] uppercase">von 5</p>
          </div>
        </div>
        <ul className="mt-1">
          {rows.map(([name, r, why]) => (
            <li key={name} className="flex h-16 flex-col justify-center border-b border-rule">
              <div className="flex items-center justify-between gap-3 text-[14px] font-semibold">{name}<Boxes value={r} /></div>
              <p className="font-display text-[15px] text-accent-700 italic">„{why}“</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] tracking-widest text-muted uppercase">Beispieldaten</span>
          <span className="stamp text-base">Passt</span>
        </div>
      </div>
    </div>
  );
}

const logos = [site.cases.featured, ...site.cases.items];

export default function Home() {
  return (
    <main className="overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript([organizationJsonLd(), websiteJsonLd(), faqJsonLd(t.faq)]) }} />

      {/* Hero */}
      <section className="border-b border-ink">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 pt-14 pb-20 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-24">
          <div className="flex min-w-0 flex-col gap-7">
            <p className="eyebrow">Recruiting zum Festpreis · Akte Nr. 01</p>
            <h1 className="font-display text-[2.7rem] leading-[0.97] font-semibold tracking-[-0.03em] hyphens-auto sm:text-[5.2rem]">
              Vorqualifizierte Kandidaten.{" "}
              <span className="relative inline-block whitespace-nowrap">
                <em className="font-medium text-accent-500">Zum Festpreis.</em>
                <Underline className="absolute -bottom-2 left-0 h-3 w-full text-ink" />
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-ink/80">{t.lead}</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/kontakt" className="btn-primary px-6 py-3.5 text-base">{t.ctaContact} <Arrow className="h-4 w-6" /></Link>
              <Link href="/leistungen" className="btn-secondary px-6 py-3.5 text-base">So arbeiten wir</Link>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
              {["Werbebudget inklusive", "Daten in Frankfurt", "Shortlist mit Begründung"].map((x) => (
                <li key={x} className="flex items-center gap-1.5"><Tick className="h-5 w-5 text-accent-500" />{x}</li>
              ))}
            </ul>
          </div>
          <ScorecardSheet />
        </div>
      </section>

      {/* Customers: a table of logos */}
      <section aria-labelledby="kunden-h" className="border-b border-ink bg-paper">
        <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-[13rem_repeat(4,1fr)]">
          <h2 id="kunden-h" className="col-span-2 flex items-center border-b border-ink/15 px-4 py-5 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase md:col-span-1 md:border-r md:border-b-0">{t.trustLabel}</h2>
          {logos.map((c, i) => (
            <Link key={c.name} href="/cases" className={`flex h-24 items-center justify-center border-ink/15 px-6 grayscale transition hover:bg-canvas hover:grayscale-0 ${i % 2 === 0 ? "border-r" : "md:border-r"} ${i < 2 ? "border-b md:border-b-0" : ""} ${i === logos.length - 1 ? "md:border-r-0" : ""}`}>
              <Image src={c.logo} alt={c.name} width={240} height={84} className="h-9 w-auto max-w-[9rem] object-contain mix-blend-multiply md:h-10" />
            </Link>
          ))}
        </div>
      </section>

      {/* Proof: a real result, then two facts that hold by design */}
      <section aria-labelledby="proof-h" className="section grid gap-0 md:grid-cols-3">
        <Link href="/cases" className="group relative isolate flex min-h-[24rem] flex-col justify-end overflow-hidden border-2 border-ink p-7 text-paper md:col-span-2 md:row-span-2 md:p-10">
          <Image src="/cases/stepin-team.jpg" alt="" fill sizes="(min-width: 768px) 66vw, 100vw" className="-z-20 object-cover grayscale-[35%] transition duration-700 group-hover:grayscale-0" />
          <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/75 to-ink/0" />
          <span className="stamp absolute top-6 right-6 rotate-[8deg] border-paper bg-ink/40 text-paper">Erfolgsgeschichte</span>
          <p className="label text-paper/80">{stepin.name}</p>
          <h2 id="proof-h" className="mt-3 max-w-xl font-display text-4xl leading-[1] font-semibold sm:text-6xl">{stepin.headline}</h2>
          <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4 border-t border-paper/30 pt-5">
            {stepin.results.slice(0, 3).map((r) => (
              <div key={r.label}>
                <dt className="sr-only">{r.label}</dt>
                <dd><span className="block font-display text-4xl font-semibold text-marker">{r.value}</span><span className="font-mono text-[11px] tracking-wide text-paper/85 uppercase">{r.label}</span></dd>
              </div>
            ))}
          </dl>
          <span className="mt-6 inline-flex items-center gap-2 font-semibold">Zur Erfolgsgeschichte <Arrow className="h-4 w-6 transition group-hover:translate-x-1" /></span>
        </Link>
        {t.facts.slice(0, 2).map((f, i) => (
          <div key={f.value} className={`flex flex-col justify-between gap-6 border-2 border-ink p-7 md:border-l-0 ${i === 0 ? "border-t-0 md:border-t-2 md:border-b-0" : "border-t-0 md:border-t-2"} ${i === 1 ? "bg-marker" : "bg-paper"}`}>
            <p className="label">{i === 0 ? "Bewerbung" : "Preis"}</p>
            <div>
              <p className="font-display text-6xl font-semibold tracking-tight">{f.value}</p>
              <p className="mt-2 max-w-xs text-ink/80">{f.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* What you get: a table of contents */}
      <section aria-labelledby="leistungen-h" className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-6 border-b-2 border-ink pb-8 md:grid-cols-[1fr_1fr] md:items-end">
          <div>
            <p className="eyebrow">Inhalt</p>
            <h2 id="leistungen-h" className="section-title mt-3">Recruiting-Marketing und Vorauswahl aus einer Hand</h2>
          </div>
          <p className="text-lg text-ink/80 md:pb-1">Sechs Bausteine, ein Preis. Sie geben das Briefing, wir liefern die Shortlist – und zeigen, was es gekostet hat.</p>
        </div>
        <ol>
          {site.services.items.map((it, i) => (
            <li key={it.title} className="group grid grid-cols-[3rem_1fr] gap-x-4 gap-y-1 border-b border-ink/20 py-6 transition hover:bg-paper md:grid-cols-[5rem_1fr_1.4fr] md:items-baseline md:px-2">
              <span className="font-mono text-sm text-accent-700">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="font-display text-2xl font-semibold md:text-3xl">{it.title}</h3>
              <p className="col-start-2 text-ink/80 md:col-start-3">{it.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Process: four index cards */}
      <section aria-labelledby="ablauf" className="border-y border-ink bg-paper">
        <div className="section">
          <div className="max-w-2xl">
            <p className="eyebrow">Ablauf</p>
            <h2 id="ablauf" className="section-title mt-3">Vom Briefing zur Shortlist</h2>
            <p className="mt-4 text-lg text-ink/80">Sie erklären uns einmal, wen Sie suchen. Danach bekommen Sie nur noch Kandidaten, die passen.</p>
          </div>
          <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.steps.map((s, i) => (
              <li key={s.title} className={`relative border-2 border-ink bg-canvas p-6 pt-10 transition hover:rotate-0 ${["-rotate-1", "rotate-1", "-rotate-[0.5deg]", "rotate-[1.5deg]"][i]}`}>
                <span className="absolute -top-px left-5 -translate-y-full border-2 border-b-0 border-ink bg-ink px-3 py-1 font-mono text-[11px] font-semibold tracking-widest text-paper">SCHRITT {i + 1}</span>
                <h3 className="font-display text-2xl font-semibold leading-tight">{s.title}</h3>
                <p className="mt-3 text-[15px] text-ink/80">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Comparison: crossed out vs. ticked */}
      <section className="section">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title">{t.compare.title}</h2>
          <p className="mt-4 text-lg text-ink/80">{t.compare.lead}</p>
        </div>
        <div className="mt-12 grid border-2 border-ink md:grid-cols-2">
          <div className="bg-canvas p-8">
            <h3 className="label">{t.compare.before}</h3>
            <ul className="mt-6 flex flex-col gap-5">
              {t.compare.rows.map(([a]) => (
                <li key={a} className="flex gap-3 text-ink/60"><Cross className="mt-0.5 h-5 w-5 shrink-0 text-ink/50" /><span className="line-through decoration-accent-500/70 decoration-2">{a}</span></li>
              ))}
            </ul>
          </div>
          <div className="border-t-2 border-ink bg-paper p-8 md:border-t-0 md:border-l-2">
            <h3 className="label text-accent-700">{t.compare.after}</h3>
            <ul className="mt-6 flex flex-col gap-5">
              {t.compare.rows.map(([a, b]) => (
                <li key={a} className="flex gap-3 font-medium"><Tick className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" /><span className="marker">{b}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section aria-labelledby="case-h" className="grain bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:py-24 lg:grid-cols-[0.35fr_1fr]">
          <div className="flex flex-col gap-4">
            <p className="font-mono text-[11px] tracking-[0.16em] text-paper/70 uppercase">Stimme aus der Praxis</p>
            <Image src={stepin.quotePhoto} alt="" width={160} height={160} loading="eager" className="h-28 w-28 border-2 border-paper object-cover grayscale" />
            <p><span className="block font-semibold">{stepin.quoteBy}</span><span className="text-sm text-paper/70">{stepin.quoteRole}</span></p>
          </div>
          <figure>
            <h2 id="case-h" className="sr-only">Was Stepin über die Zusammenarbeit sagt</h2>
            <blockquote className="font-display text-3xl leading-[1.15] font-medium sm:text-5xl">
              <span className="text-accent-500">„</span>{stepin.quote.split("!")[0]}!<span className="text-accent-500">“</span>
            </blockquote>
            <figcaption className="mt-8"><Link href="/cases" className="btn-light">Ganze Geschichte lesen <Arrow className="h-4 w-6" /></Link></figcaption>
          </figure>
        </div>
      </section>

      {/* Portal: a ledger */}
      <section className="section grid items-center gap-14 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Kundenportal</p>
          <h2 className="section-title mt-3">{t.portal.title}</h2>
          <p className="mt-4 text-lg text-ink/80">{t.portal.lead}</p>
          <ul className="mt-7 flex flex-col gap-3">
            {t.portal.points.map((p) => (
              <li key={p} className="flex gap-3"><Tick className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" />{p}</li>
            ))}
          </ul>
        </div>
        <div aria-hidden="true" className="hard-shadow-pink border-2 border-ink bg-paper">
          <div className="flex items-center justify-between border-b-2 border-ink px-5 py-3">
            <p className="font-display text-lg font-semibold">Elektroniker (m/w/d)</p>
            <span className="border border-ink bg-marker px-2 py-0.5 font-mono text-[10px] font-semibold tracking-widest uppercase">Kampagne läuft</span>
          </div>
          <div className="grid grid-cols-3 border-b border-ink/20">
            {[["Bewerbungen", "48"], ["Passend", "11"], ["Shortlist", "5"]].map(([l, v], i) => (
              <div key={l} className={`px-5 py-4 ${i ? "border-l border-ink/20" : ""}`}>
                <p className="font-display text-4xl font-semibold tabular-nums">{v}</p>
                <p className="label mt-1">{l}</p>
              </div>
            ))}
          </div>
          <div className="px-5 pt-5 pb-3">
            <div className="flex h-28 items-end gap-2 border-b-2 border-ink">
              {[30, 45, 38, 60, 52, 70, 64].map((h, i) => (
                <div key={i} className={`flex-1 border-2 border-b-0 border-ink ${i === 6 ? "bg-accent-500" : "bg-canvas"}`} style={{ height: `${h}%` }} />
              ))}
            </div>
            <p className="mt-2 font-mono text-[10px] tracking-widest text-muted uppercase">Bewerbungen pro Tag · Beispieldaten</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-24 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow">Fragen</p>
          <h2 className="section-title mt-3">Häufige Fragen</h2>
          <p className="mt-4 text-ink/80">Ihre Frage ist nicht dabei? <Link href="/kontakt" className="font-semibold underline decoration-accent-500 decoration-2 underline-offset-4">Schreiben Sie uns.</Link></p>
        </div>
        <div className="border-t-2 border-ink">
          {t.faq.map((f) => (
            <details key={f.q} className="group border-b border-ink/25">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <Plus className="h-5 w-5 shrink-0 transition group-open:rotate-45" />
              </summary>
              <p className="pb-6 text-ink/80">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="relative border-2 border-ink bg-marker px-8 py-14 md:px-14 md:py-16">
          <span className="stamp absolute top-6 right-6 hidden rotate-[7deg] bg-paper md:inline-block">Festpreis</span>
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-display text-4xl leading-[1.02] font-semibold sm:text-6xl">
                Eine Stelle, die{" "}
                <span className="relative inline-block">
                  besetzt
                  <Circle className="pointer-events-none absolute top-[-0.35em] left-[-0.3em] h-[calc(100%+0.6em)] w-[calc(100%+0.6em)] text-accent-700" />
                </span>{" "}
                werden muss?
              </h2>
              <p className="mt-4 text-lg text-ink/85">{t.promise}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/kontakt" className="btn-primary px-6 py-3.5 text-base">{t.ctaContact} <Arrow className="h-4 w-6" /></Link>
              <Link href="/jobs" className="btn-secondary px-6 py-3.5 text-base">{t.ctaJobs}</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
