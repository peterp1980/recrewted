import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Arrow } from "@/components/marks";
import { PageHero } from "@/components/PageHero";
import { site } from "@/content/site";

const t = site.services;
export const metadata: Metadata = pageMeta({ title: `${t.title} – recrewted`, description: t.lead, path: "/leistungen" });

export default function ServicesPage() {
  return (
    <main className="overflow-x-clip">
      <PageHero eyebrow="Was wir machen" title={t.title} lead={t.lead}>
        <div className="flex flex-wrap gap-4 pt-2">
          <Link href="/kontakt" className="btn-primary px-6 py-3">Gespräch vereinbaren <Arrow className="h-4 w-6" /></Link>
          <Link href="/pakete" className="btn-secondary px-6 py-3">Pakete ansehen</Link>
        </div>
      </PageHero>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <ol className="grid border-t-2 border-l-2 border-ink md:grid-cols-2 lg:grid-cols-3">
          {t.items.map((s, i) => (
            <li key={s.title} className={`flex min-h-[16rem] flex-col gap-4 border-r-2 border-b-2 border-ink p-7 ${i === 3 ? "bg-marker" : i === 5 ? "bg-ink text-paper" : "bg-paper"}`}>
              <span className={`font-mono text-sm ${i === 5 ? "text-accent-500" : "text-accent-700"}`}>{String(i + 1).padStart(2, "0")} / {String(t.items.length).padStart(2, "0")}</span>
              <h2 className="font-display text-3xl font-semibold leading-tight">{s.title}</h2>
              <p className={i === 5 ? "text-paper/85" : "text-ink/80"}>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-start gap-6 border-2 border-ink bg-paper px-8 py-12 md:flex-row md:items-center md:justify-between md:px-12">
          <h2 className="max-w-2xl font-display text-4xl leading-tight font-semibold">Alles aus einer Hand, <span className="marker">zu einem festen Preis.</span></h2>
          <Link href="/kontakt" className="btn-primary shrink-0 px-6 py-3.5">Gespräch vereinbaren <Arrow className="h-4 w-6" /></Link>
        </div>
      </section>
    </main>
  );
}
