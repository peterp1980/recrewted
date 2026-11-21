import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site";
import { PageHero } from "@/components/PageHero";

const t = site.packages;
export const metadata: Metadata = { title: `${t.title} – recrewted`, description: t.lead, alternates: { canonical: `${siteUrl()}/pakete` } };

export default function PackagesPage() {
  return (
    <main className="overflow-x-clip">
      <PageHero eyebrow="Festpreis pro Vakanz" title={t.title} lead={t.lead} center />
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 md:py-20">
      <div className="grid items-stretch gap-6 md:grid-cols-3">
        {t.items.map((p, i) => {
          const featured = i === 1;
          return (
            <section
              key={p.name}
              className={`relative flex flex-col gap-5 rounded-3xl p-7 ${featured ? "overflow-hidden bg-night text-white shadow-[0_30px_80px_-30px_rgb(29_192_209/0.5)] ring-1 ring-brand-500/40 md:-my-4 md:py-11" : "card-hover border border-neutral-200 bg-white shadow-sm"}`}
            >
              {featured && <div aria-hidden="true" className="hero-glow pointer-events-none absolute inset-0 opacity-60" />}
              {featured && <span className="relative self-start rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white">Häufig gewählt</span>}
              <div className="relative">
                <h2 className="font-display text-2xl font-bold">{p.name}</h2>
                <p className={`mt-2 ${featured ? "text-white/80" : "text-ink/75"}`}>{p.text}</p>
              </div>
              <p className={`relative border-y py-4 font-display text-xl font-bold ${featured ? "border-white/15" : "border-neutral-200"}`}>{t.price}</p>
              <ul className="relative flex flex-1 flex-col gap-3">
                {p.points.map((x) => (
                  <li key={x} className="flex gap-3">
                    <Check className={`mt-0.5 h-5 w-5 shrink-0 ${featured ? "text-brand-300" : "text-brand-700"}`} aria-hidden="true" />
                    <span className={featured ? "" : "text-ink/80"}>{x}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/kontakt?paket=${encodeURIComponent(p.name)}`}
                className={featured ? "btn-light relative py-3" : "btn-secondary py-3"}
              >
                {p.name} anfragen <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>
          );
        })}
      </div>
      <p className="text-center text-muted">{t.note}</p>
      </div>
    </main>
  );
}
