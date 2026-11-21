import type { Metadata } from "next";
import { BarChart3, ClipboardList, FileCheck2, LayoutDashboard, Megaphone, PenLine } from "lucide-react";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site";

const t = site.services;
const ICONS = [ClipboardList, PenLine, Megaphone, FileCheck2, LayoutDashboard, BarChart3];
export const metadata: Metadata = { title: `${t.title} – recrewted`, description: t.lead, alternates: { canonical: `${siteUrl()}/leistungen` } };

export default function ServicesPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14">
      <div className="flex flex-col gap-3">
        <p className="eyebrow">Was wir machen</p>
        <h1 className="text-4xl font-bold">{t.title}</h1>
        <p className="max-w-2xl text-lg text-ink/80">{t.lead}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {t.items.map((s, i) => {
          const Icon = ICONS[i] ?? ClipboardList;
          return (
            <section key={s.title} className="card flex flex-col gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-800"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="text-ink/80">{s.text}</p>
            </section>
          );
        })}
      </div>
    </main>
  );
}
