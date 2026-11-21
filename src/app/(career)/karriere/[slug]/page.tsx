/* eslint-disable @next/next/no-img-element -- customer images come from any https host the admin sets; plain <img> keeps that flexible */
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Clock, MapPin, Quote, Wallet } from "lucide-react";
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
    openGraph: page.heroUrl ? { images: [{ url: page.heroUrl }] } : undefined,
  };
}

const FACT_COLS: Record<number, string> = { 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" };

const paragraphs = (text: string | null) => (text ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

/** Tinted surfaces derived from the customer's brand colour. */
const tint = (pct: number) => `color-mix(in srgb, var(--c) ${pct}%, white)`;

export default async function CareerPage({ params }: Props) {
  const page = await load((await params).slug);
  const t = getMessages().careers;
  const du = page.tone === "du";
  const types = getMessages().briefing.options.employmentType;
  const color = page.brandColor ?? "#0a7f8c";
  const fg = onColor(color);
  const intro = paragraphs(page.intro);
  const jsonLd = { "@context": "https://schema.org", "@type": "Organization", name: page.name, ...(page.website ? { url: page.website } : {}), ...(page.logoUrl?.startsWith("https://") ? { logo: page.logoUrl } : {}) };

  return (
    <div style={{ "--c": color, "--c-fg": fg } as React.CSSProperties} className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />

      {/* Hero */}
      <header className="relative isolate overflow-hidden bg-ink text-white">
        {page.heroUrl ? (
          <>
            <img src={page.heroUrl} alt="" fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover" />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/55 to-black/10" />
          </>
        ) : (
          <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, black))` }} />
        )}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          {page.logoUrl ? (
            <span className="rounded-2xl bg-white px-3 py-2 shadow-lg">
              <img src={page.logoUrl} alt={page.name} className="h-10 w-auto sm:h-12" />
            </span>
          ) : (
            <p className="font-display text-xl font-extrabold tracking-tight">{page.name}</p>
          )}
          <nav aria-label="Seitenbereiche" className="hidden gap-6 text-sm font-semibold text-white/85 md:flex">
            <a href="#stellen" className="hover:text-white">{t.openJobs}</a>
            {page.benefits.length > 0 && <a href="#benefits" className="hover:text-white">{t.benefits}</a>}
            {page.testimonials.length > 0 && <a href="#team" className="hover:text-white">{t.team}</a>}
            <a href="#kontakt" className="hover:text-white">{t.contact}</a>
          </nav>
        </div>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-16 pb-28 md:pt-24 md:pb-36">
          <p className="inline-flex items-center gap-2 self-start rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[var(--c)]" /> {t.jobsCount(page.jobs.length)}
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">{page.headline || t.defaultHeadline(page.name)}</h1>
          {intro[0] && <p className="max-w-2xl text-lg text-white/85 sm:text-xl">{intro[0]}</p>}
          <div className="flex flex-wrap gap-3">
            <a href="#stellen" className="inline-flex items-center gap-2 rounded-xl bg-[var(--c)] px-6 py-3.5 font-semibold text-[var(--c-fg)] shadow-lg transition hover:brightness-110">
              {t.toJobs} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            {intro.length > 1 && (
              <a href="#ueber-uns" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3.5 font-semibold text-white backdrop-blur transition hover:bg-white/10">
                {t.about(page.name)}
              </a>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Facts, overlapping the hero */}
        {page.facts.length > 0 && (
          <section aria-label={t.facts} className="relative z-10 mx-auto -mt-16 max-w-6xl px-4">
            <dl className={`grid gap-px overflow-hidden rounded-3xl bg-neutral-200 shadow-xl sm:grid-cols-2 ${FACT_COLS[page.facts.length] ?? ""}`}>
              {page.facts.map((f) => (
                <div key={f.label} className="flex flex-col gap-1 bg-white px-6 py-6">
                  <dt className="order-2 text-sm text-ink/70">{f.label}</dt>
                  <dd className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ color: `color-mix(in srgb, ${color} 85%, black)` }}>{f.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Jobs */}
        <section id="stellen" aria-labelledby="stellen-h" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider" style={{ color: `color-mix(in srgb, ${color} 80%, black)` }}>{t.jobsEyebrow}</p>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">{t.openJobs}</h2>
            </div>
            <p className="max-w-md text-ink/70">{du ? t.quickDu : t.quick}</p>
          </div>
          {page.jobs.length === 0 ? (
            <p className="mt-10 rounded-3xl p-8 text-ink/80" style={{ background: tint(8) }}>{t.noJobs}</p>
          ) : (
            <ul className="mt-10 grid gap-5 md:grid-cols-2">
              {page.jobs.map((j) => {
                const salary = salaryText(j.salaryMin, j.salaryMax, j.salaryPeriod);
                return (
                  <li key={j.id}>
                    <Link
                      href={`${jobPath(j)}?quelle=karriereseite`}
                      className="group relative flex h-full flex-col gap-5 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[var(--c)] hover:shadow-xl"
                    >
                      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-[var(--c)] opacity-0 transition group-hover:opacity-100" />
                      <h3 className="text-xl font-bold leading-snug">{j.title}</h3>
                      <ul className="flex flex-wrap gap-2 text-sm">
                        <li className="inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: tint(12) }}><MapPin className="h-4 w-4" aria-hidden="true" />{j.remote ? getMessages().jobs.remote : j.location}</li>
                        {j.employmentType && <li className="inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: tint(12) }}><Clock className="h-4 w-4" aria-hidden="true" />{types[j.employmentType]}</li>}
                        {salary && <li className="inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: tint(12) }}><Wallet className="h-4 w-4" aria-hidden="true" />{salary}</li>}
                      </ul>
                      <span className="mt-auto inline-flex items-center gap-2 font-semibold">
                        {t.view} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Benefits */}
        {page.benefits.length > 0 && (
          <section id="benefits" aria-labelledby="benefits-h" className="scroll-mt-6" style={{ background: tint(7) }}>
            <div className="mx-auto max-w-6xl px-4 py-20">
              <h2 id="benefits-h" className="text-3xl font-extrabold sm:text-4xl">{t.benefits}</h2>
              <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {page.benefits.map((b) => (
                  <li key={b.title} className="rounded-3xl bg-white p-6 shadow-sm">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--c)] text-[var(--c-fg)]"><Check className="h-5 w-5" aria-hidden="true" /></span>
                    <h3 className="mt-5 text-lg font-bold">{b.title}</h3>
                    {b.text && <p className="mt-2 text-ink/75">{b.text}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* About */}
        {intro.length > 1 && (
          <section id="ueber-uns" className="mx-auto max-w-3xl scroll-mt-6 px-4 py-20">
            <h2 className="text-3xl font-extrabold sm:text-4xl">{t.about(page.name)}</h2>
            <div className="mt-6 flex flex-col gap-4 text-lg leading-relaxed text-ink/80">
              {intro.slice(1).map((p) => <p key={p}>{p}</p>)}
            </div>
          </section>
        )}

        {/* Employee voices */}
        {page.testimonials.length > 0 && (
          <section id="team" aria-labelledby="team-h" className="scroll-mt-6 bg-ink text-white">
            <div className="mx-auto max-w-6xl px-4 py-20">
              <h2 id="team-h" className="text-3xl font-extrabold sm:text-4xl">{t.voices}</h2>
              <ul className="mt-10 grid gap-6 lg:grid-cols-2">
                {page.testimonials.map((v) => (
                  <li key={v.name} className="flex flex-col gap-6 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 sm:flex-row">
                    {v.photo && <img src={v.photo} alt={v.name} loading="lazy" className="h-40 w-40 shrink-0 rounded-2xl object-cover object-top sm:h-48 sm:w-40" />}
                    <figure className="flex flex-col">
                      <Quote aria-hidden="true" className="h-8 w-8 text-[var(--c)]" />
                      <blockquote className="mt-3 leading-relaxed text-white/90">„{v.quote}“</blockquote>
                      <figcaption className="mt-auto pt-5">
                        <span className="block font-bold">{v.name}</span>
                        {v.role && <span className="text-sm text-white/65">{v.role}</span>}
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Office and contact */}
        <section id="kontakt" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20">
          <div className="grid gap-8 overflow-hidden rounded-3xl p-8 md:grid-cols-[1.3fr_1fr] md:p-12" style={{ background: tint(10) }}>
            <div>
              <h2 className="text-3xl font-extrabold">{du ? t.ctaTitleDu : t.ctaTitle}</h2>
              {page.office && paragraphs(page.office).map((p) => <p key={p} className="mt-3 text-ink/80">{p}</p>)}
              {page.jobs.length > 0 && (
                <a href="#stellen" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--c)] px-6 py-3.5 font-semibold text-[var(--c-fg)] transition hover:brightness-110">
                  {t.toJobs} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </div>
            {page.contact && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="font-bold">{t.contact}</h3>
                <p className="mt-2 whitespace-pre-line text-ink/80">{page.contact}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Mobile: jobs always one tap away */}
      {page.jobs.length > 0 && (
        <a href="#stellen" className="fixed right-4 bottom-20 z-40 inline-flex items-center gap-2 rounded-full bg-[var(--c)] px-5 py-3 font-semibold text-[var(--c-fg)] shadow-xl md:hidden">
          {t.jobsCount(page.jobs.length)}
        </a>
      )}

      <footer className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
          <span>{page.website ? <a href={page.website} rel="noopener" className="underline">{page.name}</a> : page.name} · {t.poweredBy}</span>
          <nav aria-label="Rechtliches" className="flex gap-4">
            <Link href="/impressum" className="hover:text-ink">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-ink">Datenschutz</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
