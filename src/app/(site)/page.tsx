import Link from "next/link";
import type { Metadata } from "next";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site";

const t = site.home;
export const metadata: Metadata = { title: t.title, description: t.description, alternates: { canonical: `${siteUrl()}/` } };

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12">
      <section className="flex flex-col gap-5">
        <h1 className="text-3xl font-semibold sm:text-5xl">{t.headline}</h1>
        <p className="max-w-2xl text-lg text-neutral-700">{t.lead}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/kontakt" className="rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700">{t.ctaContact}</Link>
          <Link href="/jobs" className="rounded-md border border-neutral-400 px-5 py-3 font-medium hover:bg-neutral-100">{t.ctaJobs}</Link>
        </div>
      </section>
      <section aria-label="So läuft es ab">
        <ol className="grid gap-4 sm:grid-cols-2">
          {t.steps.map((s, i) => (
            <li key={s.title} className="rounded-md border border-neutral-200 p-5">
              <p className="text-sm text-neutral-500">Schritt {i + 1}</p>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="mt-1 text-neutral-700">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <p className="max-w-2xl text-neutral-700">{t.promise}</p>
    </main>
  );
}
