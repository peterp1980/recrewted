import Link from "next/link";
import type { Metadata } from "next";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site";

const t = site.packages;
export const metadata: Metadata = { title: `${t.title} – recrewted`, description: t.lead, alternates: { canonical: `${siteUrl()}/pakete` } };

export default function PackagesPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">{t.title}</h1>
      <p className="max-w-2xl text-lg text-neutral-700">{t.lead}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {t.items.map((p) => (
          <section key={p.name} className="flex flex-col gap-2 rounded-md border border-neutral-200 p-5">
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <p className="text-neutral-700">{p.text}</p>
            <ul className="ml-5 list-disc text-neutral-700">{p.points.map((x) => <li key={x}>{x}</li>)}</ul>
          </section>
        ))}
      </div>
      <p className="text-neutral-600">{t.note}</p>
      <Link href="/kontakt" className="self-start rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700">{site.home.ctaContact}</Link>
    </main>
  );
}
