import Link from "next/link";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Arrow, Tick } from "@/components/marks";
import { site } from "@/content/site";
import { PageHero } from "@/components/PageHero";

const t = site.packages;
export const metadata: Metadata = pageMeta({ title: `${t.title} – recrewted`, description: t.lead, path: "/pakete" });

export default function PackagesPage() {
  return (
    <main className="overflow-x-clip">
      <PageHero eyebrow="Festpreis pro Vakanz" title={t.title} lead={t.lead} />
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 md:py-20">
        <div className="grid items-stretch gap-8 md:grid-cols-3 md:gap-6">
          {t.items.map((p, i) => {
            const featured = i === 1;
            return (
              <section key={p.name} className={`relative flex flex-col gap-5 border-2 border-ink p-7 ${featured ? "hard-shadow-pink bg-paper md:-translate-y-3" : "bg-canvas"}`}>
                {featured && <span className="stamp absolute -top-4 right-4 rotate-[5deg] bg-paper">Häufig gewählt</span>}
                <p className="label">Paket {String(i + 1).padStart(2, "0")}</p>
                <div>
                  <h2 className="font-display text-4xl font-semibold">{p.name}</h2>
                  <p className="mt-2 text-ink/80">{p.text}</p>
                </div>
                <p className="border-y-2 border-ink py-3 font-mono text-sm font-semibold tracking-wide uppercase">{t.price}</p>
                <ul className="flex flex-1 flex-col gap-3">
                  {p.points.map((x) => (
                    <li key={x} className="flex gap-3"><Tick className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" /><span>{x}</span></li>
                  ))}
                </ul>
                <Link href={`/kontakt?paket=${encodeURIComponent(p.name)}`} className={featured ? "btn-primary py-3" : "btn-secondary py-3"}>
                  {p.name} anfragen <Arrow className="h-4 w-6" />
                </Link>
              </section>
            );
          })}
        </div>
        <p className="text-center font-mono text-sm text-muted">{t.note}</p>
      </div>
    </main>
  );
}
