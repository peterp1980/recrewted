import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { ArrowRight, Quote, X } from "lucide-react";
import { site } from "@/content/site";
import { PageHero } from "@/components/PageHero";

const t = site.cases;
const c = t.featured;
export const metadata: Metadata = pageMeta({ title: `${t.title} – recrewted`, description: t.lead, path: "/cases" });

export default function CasesPage() {
  return (
    <main className="overflow-x-clip">
      <PageHero eyebrow="Referenzen" title={t.title} lead={t.lead} />

      {/* Main case */}
      <article aria-labelledby="stepin" className="mt-16">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col gap-5">
            <Image src={c.logo} alt={c.name} width={200} height={70} className="h-12 w-auto self-start" />
            <p className="eyebrow">{c.eyebrow}</p>
            <h2 id="stepin" className="text-3xl font-bold sm:text-4xl">{c.headline}</h2>
            <p className="text-lg text-ink/75">{c.about}</p>
            <p className="text-lg text-ink/75">{c.goal}</p>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div aria-hidden="true" className="brand-glow absolute -inset-8 -z-10 blur-2xl" />
            <Image src={c.mark} alt="" width={800} height={800} className="h-auto w-full" priority />
          </div>
        </section>

        {/* Results */}
        <section aria-label="Ergebnisse" className="mx-auto mt-16 grid max-w-6xl gap-5 px-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.results.map((r) => (
            <div key={r.label} className="card">
              <p className="font-display text-4xl font-extrabold tracking-tight text-brand-800">{r.value}</p>
              <p className="mt-1 font-semibold">{r.label}</p>
              <p className="mt-2 text-sm text-ink/70">{r.text}</p>
            </div>
          ))}
        </section>

        {/* Quote */}
        <section className="relative mt-20 overflow-hidden bg-night text-white">
          <div aria-hidden="true" className="hero-glow absolute inset-0 opacity-70" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[0.6fr_1.4fr] md:py-20">
            <Image src={c.quotePhoto} alt={c.quoteBy} width={800} height={790} className="mx-auto aspect-square w-full max-w-xs rounded-3xl object-cover shadow-2xl" />
            <figure>
              <Quote aria-hidden="true" className="h-10 w-10 text-accent-500" />
              <blockquote className="mt-4 text-xl leading-relaxed sm:text-2xl">„{c.quote}“</blockquote>
              <figcaption className="mt-6">
                <span className="block font-semibold">{c.quoteBy}</span>
                <span className="text-white/70">{c.quoteRole}</span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Challenge and solution */}
        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-20 md:grid-cols-2">
          <div className="rounded-3xl border border-neutral-200 bg-white p-8">
            <h3 className="text-2xl font-bold">Die Ausgangslage</h3>
            <p className="mt-3 text-ink/75">{c.challengeText}</p>
            <ul className="mt-5 flex flex-col gap-3">
              {c.challenges.map((x) => (
                <li key={x} className="flex items-center gap-3"><X className="h-5 w-5 shrink-0 text-accent-700" aria-hidden="true" />{x}</li>
              ))}
            </ul>
          </div>
          <div className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-3xl bg-night p-8 text-white">
            <div aria-hidden="true" className="hero-glow absolute inset-0 opacity-60" />
            <div className="relative">
              <h3 className="text-2xl font-bold">Die Lösung</h3>
              <p className="mt-3 text-lg text-white/80">{c.solution}</p>
            </div>
            <Link href="/kontakt" className="btn-light relative self-start px-5 py-3">
              So etwas brauchen wir auch <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </article>

      {/* More customers */}
      <section aria-labelledby="weitere" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="weitere" className="text-3xl font-bold">Weitere Kunden</h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {t.items.map((x) => (
              <li key={x.name} className="card card-hover flex flex-col gap-4">
                <div className="flex h-20 items-center justify-center rounded-xl border border-neutral-100 bg-white">
                  <Image src={x.logo} alt={x.name} width={200} height={70} className="h-12 w-auto" />
                </div>
                <h3 className="text-lg font-bold">{x.name}</h3>
                <p className="text-ink/75">{x.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
