/* eslint-disable @next/next/no-img-element -- customer images come from any https host or the media bucket */
import { ArrowRight, Check, ChevronDown, Clock, MapPin, Quote, Wallet } from "lucide-react";
import { getMessages } from "@/i18n";
import type { CareerDocument, Section, SectionData } from "@/lib/careers/document";
import { onColor } from "@/lib/careers/profile";
import { VideoConsent } from "./VideoConsent";

// Renders a career page document. Used by the public page and, unchanged, by the editor preview,
// so what customers see while editing is what candidates will see.

export type JobCard = { id: string; title: string; href: string; location: string | null; type: string | null; salary: string | null };
type Props = {
  doc: CareerDocument;
  name: string;
  website: string | null;
  color: string | null;
  tone: "sie" | "du";
  jobs: JobCard[];
  /** In the editor preview links are inert and the floating button is hidden. */
  preview?: boolean;
};

const paragraphs = (text: string) => text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
const tint = (pct: number) => `color-mix(in srgb, var(--c) ${pct}%, white)`;
const deep = "color-mix(in srgb, var(--c) 82%, black)";
const FACT_COLS: Record<number, string> = { 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" };

function Title({ children, id }: { children: React.ReactNode; id?: string }) {
  return children ? <h2 id={id} className="text-3xl font-extrabold sm:text-4xl">{children}</h2> : null;
}

export function CareerSections({ doc, name, website, color, tone, jobs, preview = false }: Props) {
  const t = getMessages().careers;
  const c = color ?? "#0a7f8c";
  const visible = doc.sections.filter((s) => s.visible);
  const hero = visible.find((s): s is Section<"hero"> => s.type === "hero");
  const rest = visible.filter((s) => s !== hero);
  const nav = rest.filter((s) => ["jobs", "benefits", "testimonials", "faq", "contact"].includes(s.type));
  const navLabel = (s: Section) =>
    ({ jobs: t.openJobs, benefits: t.benefits, testimonials: t.team, faq: "FAQ", contact: t.contact })[s.type as "jobs"] ?? "";

  return (
    <div style={{ "--c": c, "--c-fg": onColor(c) } as React.CSSProperties} className="bg-white text-ink">
      <HeroBlock section={hero} doc={doc} name={name} jobs={jobs.length} nav={nav.map((s) => ({ id: s.id, label: navLabel(s) }))} />
      <main id="inhalt" tabIndex={-1} className="outline-none">
        {rest.map((s) => (
          <SectionBlock key={s.id} section={s} tone={tone} jobs={jobs} preview={preview} first={s === rest[0]} jobsId={rest.find((x) => x.type === "jobs")?.id} />
        ))}
      </main>
      {!preview && jobs.length > 0 && rest.some((s) => s.type === "jobs") && (
        <nav aria-label={t.openJobs} className="md:hidden">
          <a href={`#${rest.find((s) => s.type === "jobs")!.id}`} className="fixed right-4 bottom-20 z-40 inline-flex items-center gap-2 rounded-full bg-[var(--c)] px-5 py-3 font-semibold text-[var(--c-fg)] shadow-xl">
            {t.jobsCount(jobs.length)}
          </a>
        </nav>
      )}
      <footer className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
          <span>{website ? <a href={website} rel="noopener" className="underline">{name}</a> : name} · {t.poweredBy}</span>
          <nav aria-label="Rechtliches" className="flex gap-4">
            <a href="/impressum" className="hover:text-ink">Impressum</a>
            <a href="/datenschutz" className="hover:text-ink">Datenschutz</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function HeroBlock({ section, doc, name, jobs, nav }: { section?: Section<"hero">; doc: CareerDocument; name: string; jobs: number; nav: { id: string; label: string }[] }) {
  const t = getMessages().careers;
  const d: SectionData["hero"] = section?.data ?? { headline: "", text: "", imageUrl: null };
  const jobsId = nav.find((n) => n.label === t.openJobs)?.id;
  return (
    <header className="relative isolate overflow-hidden bg-ink text-white">
      {d.imageUrl ? (
        <>
          <img src={d.imageUrl} alt="" fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/65 to-black/40 md:bg-gradient-to-r md:from-black/80 md:via-black/55 md:to-black/10" />
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: "linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 55%, black))" }} />
      )}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
        {doc.logoUrl ? (
          <span className="rounded-2xl bg-white px-3 py-2 shadow-lg">
            <img src={doc.logoUrl} alt={name} className="h-10 w-auto sm:h-12" />
          </span>
        ) : (
          <p className="font-display text-xl font-extrabold tracking-tight">{name}</p>
        )}
        {nav.length > 0 && (
          <nav aria-label="Seitenbereiche" className="hidden gap-6 text-sm font-semibold text-white/85 md:flex">
            {nav.map((n) => <a key={n.id} href={`#${n.id}`} className="hover:text-white">{n.label}</a>)}
          </nav>
        )}
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-16 pb-28 md:pt-24 md:pb-36">
        {jobs > 0 && (
          <p className="inline-flex items-center gap-2 self-start rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[var(--c)]" /> {t.jobsCount(jobs)}
          </p>
        )}
        <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">{d.headline || t.defaultHeadline(name)}</h1>
        {d.text && <p className="max-w-2xl text-lg text-white/85 sm:text-xl">{d.text}</p>}
        {jobs > 0 && jobsId && (
          <a href={`#${jobsId}`} className="inline-flex items-center gap-2 self-start rounded-xl bg-[var(--c)] px-6 py-3.5 font-semibold text-[var(--c-fg)] shadow-lg transition hover:brightness-110">
            {t.toJobs} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>
    </header>
  );
}

function SectionBlock({ section: s, tone, jobs, preview, first, jobsId }: { section: Section; tone: "sie" | "du"; jobs: JobCard[]; preview: boolean; first: boolean; jobsId?: string }) {
  const t = getMessages().careers;
  const wrap = "mx-auto max-w-6xl scroll-mt-6 px-4 py-20";

  switch (s.type) {
    case "facts": {
      const d = s.data as SectionData["facts"];
      if (d.items.length === 0) return null;
      return (
        <section id={s.id} aria-label={t.facts} className={`relative z-10 mx-auto max-w-6xl px-4 ${first ? "-mt-16" : "py-12"}`}>
          <dl className={`grid gap-px overflow-hidden rounded-3xl bg-neutral-200 shadow-xl sm:grid-cols-2 ${FACT_COLS[d.items.length] ?? ""}`}>
            {d.items.map((f, i) => (
              <div key={i} className="flex flex-col gap-1 bg-white px-6 py-6">
                <dt className="order-2 text-sm text-ink/70">{f.label}</dt>
                <dd className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ color: deep }}>{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    }
    case "jobs": {
      const d = s.data as SectionData["jobs"];
      return (
        <section id={s.id} className={wrap}>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider" style={{ color: deep }}>{t.jobsEyebrow}</p>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">{d.title || t.openJobs}</h2>
            </div>
            <p className="max-w-md text-ink/70">{d.text || (tone === "du" ? t.quickDu : t.quick)}</p>
          </div>
          {jobs.length === 0 ? (
            <p className="mt-10 rounded-3xl p-8 text-ink/80" style={{ background: tint(8) }}>{t.noJobs}</p>
          ) : (
            <ul className="mt-10 grid gap-5 md:grid-cols-2">
              {jobs.map((j) => (
                <li key={j.id}>
                  <a href={j.href} className="group relative flex h-full flex-col gap-5 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[var(--c)] hover:shadow-xl">
                    <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-[var(--c)] opacity-0 transition group-hover:opacity-100" />
                    <h3 className="text-xl font-bold leading-snug">{j.title}</h3>
                    <ul className="flex flex-wrap gap-2 text-sm">
                      {j.location && <li className="inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: tint(12) }}><MapPin className="h-4 w-4" aria-hidden="true" />{j.location}</li>}
                      {j.type && <li className="inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: tint(12) }}><Clock className="h-4 w-4" aria-hidden="true" />{j.type}</li>}
                      {j.salary && <li className="inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: tint(12) }}><Wallet className="h-4 w-4" aria-hidden="true" />{j.salary}</li>}
                    </ul>
                    <span className="mt-auto inline-flex items-center gap-2 font-semibold">{t.view} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      );
    }
    case "benefits": {
      const d = s.data as SectionData["benefits"];
      return (
        <section id={s.id} className="scroll-mt-6" style={{ background: tint(7) }}>
          <div className="mx-auto max-w-6xl px-4 py-20">
            <Title>{d.title}</Title>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {d.items.map((b, i) => (
                <li key={i} className="rounded-3xl bg-white p-6 shadow-sm">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--c)] text-[var(--c-fg)]"><Check className="h-5 w-5" aria-hidden="true" /></span>
                  <h3 className="mt-5 text-lg font-bold">{b.title}</h3>
                  {b.text && <p className="mt-2 text-ink/75">{b.text}</p>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      );
    }
    case "text": {
      const d = s.data as SectionData["text"];
      return (
        <section id={s.id} className={`${wrap} ${d.imageUrl ? "grid items-center gap-12 lg:grid-cols-2" : ""}`}>
          <div className={d.imageUrl ? "" : "mx-auto max-w-3xl"}>
            <Title>{d.title}</Title>
            <div className="mt-6 flex flex-col gap-4 text-lg leading-relaxed text-ink/80">
              {paragraphs(d.body).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
            </div>
          </div>
          {d.imageUrl && <img src={d.imageUrl} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-xl" />}
        </section>
      );
    }
    case "testimonials": {
      const d = s.data as SectionData["testimonials"];
      return (
        <section id={s.id} className="scroll-mt-6 bg-ink text-white">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <Title>{d.title}</Title>
            <ul className="mt-10 grid gap-6 lg:grid-cols-2">
              {d.items.map((v, i) => (
                <li key={i} className="flex flex-col gap-6 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 sm:flex-row">
                  {v.photo && <img src={v.photo} alt={v.name} loading="lazy" className="h-40 w-40 shrink-0 rounded-2xl object-cover object-top sm:h-48" />}
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
      );
    }
    case "gallery": {
      const d = s.data as SectionData["gallery"];
      if (d.images.length === 0) return null;
      return (
        <section id={s.id} className={wrap}>
          <Title>{d.title}</Title>
          <ul className="mt-10 grid auto-rows-[200px] grid-cols-2 gap-4 md:grid-cols-4">
            {d.images.map((img, i) => (
              <li key={i} className={i % 5 === 0 ? "col-span-2 row-span-2" : ""}>
                <img src={img.url} alt={img.alt} loading="lazy" className="h-full w-full rounded-3xl object-cover" />
              </li>
            ))}
          </ul>
        </section>
      );
    }
    case "video": {
      const d = s.data as SectionData["video"];
      if (!d.youtubeId) return null;
      return (
        <section id={s.id} className={`${wrap} grid items-center gap-10 lg:grid-cols-[1fr_1.4fr]`}>
          <div>
            <Title>{d.title}</Title>
            {d.text && <p className="mt-4 text-lg text-ink/80">{d.text}</p>}
          </div>
          <VideoConsent id={d.youtubeId} title={d.title} note={t.videoNote} />
        </section>
      );
    }
    case "faq": {
      const d = s.data as SectionData["faq"];
      return (
        <section id={s.id} className={`${wrap} grid gap-10 lg:grid-cols-[0.8fr_1.2fr]`}>
          <Title>{d.title}</Title>
          <div className="divide-y divide-neutral-200 border-y border-neutral-200">
            {d.items.map((f, i) => (
              <details key={i} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="h-5 w-5 shrink-0 transition group-open:rotate-180" style={{ color: deep }} aria-hidden="true" />
                </summary>
                <p className="pb-5 whitespace-pre-line text-ink/75">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      );
    }
    case "process": {
      const d = s.data as SectionData["process"];
      return (
        <section id={s.id} className="scroll-mt-6" style={{ background: tint(7) }}>
          <div className="mx-auto max-w-6xl px-4 py-20">
            <Title>{d.title}</Title>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {d.steps.map((st, i) => (
                <li key={i} className="relative">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--c)] font-display text-lg font-bold text-[var(--c-fg)]">{i + 1}</span>
                  <h3 className="mt-5 text-lg font-bold">{st.title}</h3>
                  {st.text && <p className="mt-2 text-ink/75">{st.text}</p>}
                </li>
              ))}
            </ol>
          </div>
        </section>
      );
    }
    case "locations": {
      const d = s.data as SectionData["locations"];
      return (
        <section id={s.id} className={wrap}>
          <Title>{d.title}</Title>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {d.items.map((l, i) => (
              <li key={i} className="flex gap-4 rounded-3xl border border-neutral-200 p-6">
                <MapPin className="h-6 w-6 shrink-0" style={{ color: deep }} aria-hidden="true" />
                <div>
                  <h3 className="font-bold">{l.name}</h3>
                  <p className="mt-1 whitespace-pre-line text-ink/75">{l.address}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      );
    }
    case "contact": {
      const d = s.data as SectionData["contact"];
      const jobsAnchor = jobs.length > 0 && jobsId;
      return (
        <section id={s.id} className={wrap}>
          <div className="grid gap-8 overflow-hidden rounded-3xl p-8 md:grid-cols-[1.3fr_1fr] md:p-12" style={{ background: tint(10) }}>
            <div>
              <h2 className="text-3xl font-extrabold">{d.title || (tone === "du" ? t.ctaTitleDu : t.ctaTitle)}</h2>
              {paragraphs(d.office).map((p, i) => <p key={i} className="mt-3 whitespace-pre-line text-ink/80">{p}</p>)}
              {jobsAnchor && !preview && (
                <a href={`#${jobsId}`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--c)] px-6 py-3.5 font-semibold text-[var(--c-fg)] transition hover:brightness-110">
                  {t.toJobs} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </div>
            {d.contact && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="font-bold">{t.contact}</h3>
                <p className="mt-2 whitespace-pre-line text-ink/80">{d.contact}</p>
              </div>
            )}
          </div>
        </section>
      );
    }
    default:
      return null;
  }
}
