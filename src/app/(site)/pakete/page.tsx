import Link from "next/link";
import type { Metadata } from "next";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site";

const t = site.packages;
export const metadata: Metadata = { title: `${t.title} – recrewted`, description: t.lead, alternates: { canonical: `${siteUrl()}/pakete` } };

export default function PackagesPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14">
      <div className="flex flex-col gap-3">
        <p className="eyebrow">Festpreis pro Vakanz</p>
        <h1 className="text-4xl font-bold">{t.title}</h1>
        <p className="max-w-2xl text-lg text-ink/80">{t.lead}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {t.items.map((p, i) => (
          <section key={p.name} className={`card flex flex-col gap-3 ${i === 1 ? "ring-2 ring-brand-500" : ""}`}>
            {i === 1 && <span className="self-start rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-semibold text-accent-700">Häufig gewählt</span>}
            <h2 className="text-2xl font-bold">{p.name}</h2>
            <p className="text-ink/80">{p.text}</p>
            <ul className="flex flex-col gap-2 text-ink/80">
              {p.points.map((x) => <li key={x} className="flex gap-2"><span aria-hidden="true" className="text-brand-700">✓</span>{x}</li>)}
            </ul>
          </section>
        ))}
      </div>
      <p className="text-muted">{t.note}</p>
      <Link href="/kontakt" className="self-start rounded-lg bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800">{site.home.ctaContact}</Link>
    </main>
  );
}
