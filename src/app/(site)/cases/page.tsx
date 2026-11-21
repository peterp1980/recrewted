import type { Metadata } from "next";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site";

const t = site.cases;
export const metadata: Metadata = { title: `${t.title} – recrewted`, description: t.lead, alternates: { canonical: `${siteUrl()}/cases` } };

export default function CasesPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">{t.title}</h1>
      <p className="max-w-2xl text-lg text-neutral-700">{t.lead}</p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {t.items.map((c) => (
          <li key={c.name} className="rounded-md border border-neutral-200 p-5">
            <h2 className="text-xl font-semibold">{c.name}</h2>
            <p className="mt-1 text-neutral-700">{c.text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
