import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { ArrowRight, BarChart3, ClipboardList, FileCheck2, LayoutDashboard, Megaphone, PenLine } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { site } from "@/content/site";

const t = site.services;
const ICONS = [ClipboardList, PenLine, Megaphone, FileCheck2, LayoutDashboard, BarChart3];
export const metadata: Metadata = pageMeta({ title: `${t.title} – recrewted`, description: t.lead, path: "/leistungen" });

export default function ServicesPage() {
  return (
    <main className="overflow-x-clip">
      <PageHero eyebrow="Was wir machen" title={t.title} lead={t.lead}>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/kontakt" className="btn-light px-6 py-3">Gespräch vereinbaren <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <Link href="/pakete" className="btn-ghost-dark px-6 py-3">Pakete ansehen</Link>
        </div>
      </PageHero>
      <section className="mx-auto max-w-6xl px-4 py-20">
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {t.items.map((s, i) => {
            const Icon = ICONS[i] ?? ClipboardList;
            return (
              <li key={s.title} className="card-hover relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-7">
                <span aria-hidden="true" data-n={String(i + 1).padStart(2, "0")} className="absolute top-5 right-6 font-display text-6xl font-extrabold text-neutral-100 before:content-[attr(data-n)]" />
                <span className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ${i % 2 ? "bg-accent-50 text-accent-700" : "bg-brand-50 text-brand-800"}`}><Icon className="h-6 w-6" aria-hidden="true" /></span>
                <h2 className="relative font-display text-xl font-bold">{s.title}</h2>
                <p className="relative text-ink/70">{s.text}</p>
              </li>
            );
          })}
        </ol>
      </section>
      <section className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-[2rem] bg-night px-8 py-14 text-white md:px-14">
          <div aria-hidden="true" className="hero-glow absolute inset-0" />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <h2 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Alles aus einer Hand, zu einem festen Preis.</h2>
            <Link href="/kontakt" className="btn-light shrink-0 px-6 py-3.5">Gespräch vereinbaren <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
