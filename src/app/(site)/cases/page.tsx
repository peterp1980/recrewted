import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Arrow, Clip, Cross, Tick } from "@/components/marks";
import { site } from "@/content/site";
import { PageHero } from "@/components/PageHero";

const t = site.cases;
const c = t.featured;
export const metadata: Metadata = pageMeta({ title: `${t.title} – recrewted`, description: t.lead, path: "/cases" });

export default function CasesPage() {
  return (
    <main className="overflow-x-clip">
      <PageHero eyebrow="Referenzen" title={t.title} lead={t.lead} />

      {/* Main case as a case file */}
      <article aria-labelledby="stepin" className="mx-auto mt-16 max-w-6xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-b-0 border-ink bg-ink px-6 py-3 font-mono text-[11px] font-semibold tracking-[0.16em] text-paper uppercase">
          <span>Fallakte · {c.name}</span>
          <span>{c.eyebrow}</span>
        </div>
        <div className="grid border-2 border-ink bg-paper lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col gap-5 p-7 md:p-10">
            <Image src={c.logo} alt={c.name} width={200} height={70} className="h-11 w-auto self-start mix-blend-multiply" />
            <h2 id="stepin" className="font-display text-4xl leading-[1.02] font-semibold sm:text-6xl">{c.headline}</h2>
            <p className="text-lg text-ink/80">{c.about}</p>
            <p className="text-lg text-ink/80">{c.goal}</p>
          </div>
          <div className="relative border-t-2 border-ink lg:border-t-0 lg:border-l-2">
            <Image src="/cases/stepin-team.jpg" alt="" width={1200} height={800} className="h-full min-h-64 w-full object-cover grayscale-[30%]" priority />
            <span className="stamp absolute bottom-5 left-5 rotate-[-4deg] bg-paper">Alle Stellen besetzt</span>
          </div>
        </div>

        {/* Results */}
        <section aria-label="Ergebnisse" className="grid border-2 border-t-0 border-ink sm:grid-cols-2 lg:grid-cols-4">
          {c.results.map((r, i) => (
            <div key={r.label} className={`p-6 ${i ? "border-t-2 border-ink sm:border-t-0 sm:border-l-2" : ""} ${i === 2 ? "sm:border-l-0 lg:border-l-2" : ""} ${i >= 2 ? "sm:border-t-2 lg:border-t-0" : ""} ${i === 0 ? "bg-marker" : "bg-canvas"}`}>
              <p className="font-display text-5xl font-semibold tracking-tight">{r.value}</p>
              <p className="label mt-2 text-ink">{r.label}</p>
              <p className="mt-2 text-sm text-ink/80">{r.text}</p>
            </div>
          ))}
        </section>

        {/* Challenge and solution */}
        <section className="grid gap-6 py-16 md:grid-cols-2">
          <div className="border-2 border-ink bg-canvas p-8">
            <h3 className="font-display text-3xl font-semibold">Die Ausgangslage</h3>
            <p className="mt-3 text-ink/80">{c.challengeText}</p>
            <ul className="mt-5 flex flex-col gap-3">
              {c.challenges.map((x) => (
                <li key={x} className="flex items-center gap-3"><Cross className="h-5 w-5 shrink-0 text-accent-700" />{x}</li>
              ))}
            </ul>
          </div>
          <div className="hard-shadow-pink flex flex-col justify-between gap-6 border-2 border-ink bg-paper p-8">
            <div>
              <h3 className="font-display text-3xl font-semibold">Die Lösung</h3>
              <p className="mt-3 flex gap-3 text-lg"><Tick className="mt-1 h-5 w-5 shrink-0 text-accent-500" /><span>{c.solution}</span></p>
            </div>
            <Link href="/kontakt" className="btn-primary self-start px-5 py-3">So etwas brauchen wir auch <Arrow className="h-4 w-6" /></Link>
          </div>
        </section>
      </article>

      {/* Quote */}
      <section className="grain bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[0.5fr_1.5fr] md:py-20">
          <div className="relative mx-auto w-full max-w-[16rem]">
            <Clip className="absolute -top-6 left-6 z-10 h-14 w-6 text-paper" />
            <Image src={c.quotePhoto} alt={c.quoteBy} width={800} height={790} className="aspect-square w-full rotate-[-2deg] border-[6px] border-paper object-cover" />
          </div>
          <figure>
            <blockquote className="font-display text-2xl leading-snug font-medium sm:text-3xl"><span className="text-accent-500">„</span>{c.quote}<span className="text-accent-500">“</span></blockquote>
            <figcaption className="mt-6">
              <span className="block font-semibold">{c.quoteBy}</span>
              <span className="font-mono text-xs tracking-wide text-paper/70 uppercase">{c.quoteRole}</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* More customers */}
      <section aria-labelledby="weitere" className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="weitere" className="section-title">Weitere Kunden</h2>
        <ul className="mt-8 grid border-t-2 border-l-2 border-ink md:grid-cols-3">
          {t.items.map((x) => (
            <li key={x.name} className="flex flex-col gap-4 border-r-2 border-b-2 border-ink bg-paper p-6">
              <div className="flex h-20 items-center justify-center border border-ink/15 bg-paper">
                <Image src={x.logo} alt={x.name} width={200} height={70} className="h-11 w-auto mix-blend-multiply" />
              </div>
              <h3 className="font-display text-2xl font-semibold">{x.name}</h3>
              <p className="text-ink/80">{x.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
