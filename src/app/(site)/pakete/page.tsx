import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site";

const t = site.packages;
export const metadata: Metadata = { title: `${t.title} – recrewted`, description: t.lead, alternates: { canonical: `${siteUrl()}/pakete` } };

export default function PackagesPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 md:py-20">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
        <p className="eyebrow">Festpreis pro Vakanz</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">{t.title}</h1>
        <p className="text-lg text-ink/75">{t.lead}</p>
      </div>
      <div className="grid items-stretch gap-6 md:grid-cols-3">
        {t.items.map((p, i) => {
          const featured = i === 1;
          return (
            <section
              key={p.name}
              className={`relative flex flex-col gap-5 rounded-3xl p-7 ${featured ? "bg-brand-800 text-white shadow-2xl md:-my-4 md:py-11" : "card-hover border border-neutral-200 bg-white shadow-sm"}`}
            >
              {featured && <span className="absolute -top-3 left-7 rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white">Häufig gewählt</span>}
              <div>
                <h2 className="text-2xl font-bold">{p.name}</h2>
                <p className={`mt-2 ${featured ? "text-white/80" : "text-ink/75"}`}>{p.text}</p>
              </div>
              <p className={`border-y py-4 font-display text-xl font-bold ${featured ? "border-white/15" : "border-neutral-200"}`}>{t.price}</p>
              <ul className="flex flex-1 flex-col gap-3">
                {p.points.map((x) => (
                  <li key={x} className="flex gap-3">
                    <Check className={`mt-0.5 h-5 w-5 shrink-0 ${featured ? "text-brand-300" : "text-brand-700"}`} aria-hidden="true" />
                    <span className={featured ? "" : "text-ink/80"}>{x}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/kontakt?paket=${encodeURIComponent(p.name)}`}
                className={featured ? "inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 font-semibold text-brand-800 hover:bg-brand-50" : "btn-secondary py-3"}
              >
                {p.name} anfragen <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>
          );
        })}
      </div>
      <p className="text-center text-muted">{t.note}</p>
    </main>
  );
}
