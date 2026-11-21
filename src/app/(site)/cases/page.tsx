import type { Metadata } from "next";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site";

const t = site.cases;
export const metadata: Metadata = { title: `${t.title} – recrewted`, description: t.lead, alternates: { canonical: `${siteUrl()}/cases` } };

export default function CasesPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14">
      <div className="flex flex-col gap-3">
        <p className="eyebrow">Referenzen</p>
        <h1 className="text-4xl font-bold">{t.title}</h1>
        <p className="max-w-2xl text-lg text-ink/80">{t.lead}</p>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2">
        {t.items.map((c) => (
          <li key={c.name} className="card">
            <h2 className="text-2xl font-bold text-accent-500">{c.name}</h2>
            <p className="mt-1 text-ink/80">{c.text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
