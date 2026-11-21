import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Briefcase, Check, Clock, MapPin, Wallet } from "lucide-react";
import { getMessages } from "@/i18n";
import { onColor } from "@/lib/careers/profile";
import { jobPath, jsonLdScript, salaryText } from "@/lib/jobs/format";
import { getCareerPage } from "@/lib/jobs/public";
import { siteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

// Same freshness as the job board: filled vacancies disappear within the hour (F11).
export const revalidate = 300;

async function load(slug: string) {
  const page = await getCareerPage(slug).catch((e) => {
    console.error("career page lookup failed", e);
    return null;
  });
  if (!page) notFound();
  return page;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load((await params).slug);
  const t = getMessages().careers;
  return {
    title: t.metaTitle(page.name),
    description: t.metaDescription(page.name, page.jobs.length),
    alternates: { canonical: `${siteUrl()}/karriere/${page.slug}` },
  };
}

const paragraphs = (text: string | null) => (text ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

export default async function CareerPage({ params }: Props) {
  const page = await load((await params).slug);
  const t = getMessages().careers;
  const types = getMessages().briefing.options.employmentType;
  const color = page.brandColor ?? "#0a7f8c";
  const fg = onColor(color);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: page.name,
    ...(page.website ? { url: page.website } : {}),
  };

  return (
    <div style={{ "--c": color, "--c-fg": fg } as React.CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <p className="font-display text-xl font-extrabold tracking-tight">{page.name}</p>
          {page.website && (
            <a href={page.website} rel="noopener" className="text-sm font-medium text-ink/70 hover:text-ink">{t.website}</a>
          )}
        </div>
      </header>

      <main>
        <section className="bg-[var(--c)] text-[var(--c-fg)]">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16 md:py-24">
            <p className="text-sm font-semibold uppercase tracking-wide opacity-80">{t.jobsCount(page.jobs.length)}</p>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">{page.headline || t.defaultHeadline(page.name)}</h1>
            {paragraphs(page.intro).slice(0, 1).map((p) => <p key={p} className="max-w-2xl text-lg opacity-90">{p}</p>)}
            {page.jobs.length > 0 && (
              <a href="#stellen" className="inline-flex items-center gap-2 self-start rounded-lg bg-white px-6 py-3.5 font-semibold text-ink shadow-sm hover:bg-neutral-100">
                {t.toJobs} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </section>

        <section id="stellen" aria-labelledby="stellen-h" className="mx-auto max-w-5xl scroll-mt-4 px-4 py-16">
          <h2 id="stellen-h" className="text-3xl font-bold">{t.openJobs}</h2>
          <p className="mt-2 text-ink/70">{t.quick}</p>
          {page.jobs.length === 0 ? (
            <p className="card mt-8 text-ink/80">{t.noJobs}</p>
          ) : (
            <ul className="mt-8 flex flex-col gap-4">
              {page.jobs.map((j) => {
                const salary = salaryText(j.salaryMin, j.salaryMax, j.salaryPeriod);
                return (
                  <li key={j.id}>
                    <Link
                      href={`${jobPath(j)}?quelle=karriereseite`}
                      className="card card-hover group flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-col gap-2">
                        <h3 className="text-xl font-bold group-hover:underline">{j.title}</h3>
                        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink/70">
                          <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{j.remote ? getMessages().jobs.remote : j.location}</span>
                          {j.employmentType && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" />{types[j.employmentType]}</span>}
                          {salary && <span className="inline-flex items-center gap-1.5"><Wallet className="h-4 w-4" aria-hidden="true" />{salary}</span>}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-[var(--c)] px-5 py-2.5 font-semibold text-[var(--c-fg)] sm:self-auto">
                        {t.view} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {paragraphs(page.intro).length > 1 && (
          <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pb-16 text-lg text-ink/80">
            {paragraphs(page.intro).slice(1).map((p) => <p key={p}>{p}</p>)}
          </section>
        )}

        {page.benefits.length > 0 && (
          <section aria-labelledby="benefits-h" className="bg-white">
            <div className="mx-auto max-w-5xl px-4 py-16">
              <h2 id="benefits-h" className="text-3xl font-bold">{t.benefits}</h2>
              <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {page.benefits.map((b) => (
                  <li key={b.title} className="rounded-2xl border border-neutral-200 p-5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--c)] text-[var(--c-fg)]"><Check className="h-5 w-5" aria-hidden="true" /></span>
                    <h3 className="mt-4 font-bold">{b.title}</h3>
                    {b.text && <p className="mt-1 text-ink/75">{b.text}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {(page.office || page.contact) && (
          <section className="mx-auto grid max-w-5xl gap-8 px-4 py-16 md:grid-cols-2">
            {page.office && (
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold"><Briefcase className="h-6 w-6" aria-hidden="true" />{t.office}</h2>
                {paragraphs(page.office).map((p) => <p key={p} className="mt-3 text-ink/80">{p}</p>)}
              </div>
            )}
            {page.contact && (
              <div>
                <h2 className="text-2xl font-bold">{t.contact}</h2>
                <p className="mt-3 whitespace-pre-line text-ink/80">{page.contact}</p>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
          <span>{t.poweredBy}</span>
          <nav aria-label="Rechtliches" className="flex gap-4">
            <Link href="/impressum" className="hover:text-ink">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-ink">Datenschutz</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
