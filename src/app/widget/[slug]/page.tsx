import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getMessages } from "@/i18n";
import { onColor } from "@/lib/careers/profile";
import { jobPath, salaryText } from "@/lib/jobs/format";
import { getCareerPage } from "@/lib/jobs/public";
import { Resizer } from "./Resizer";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;
// The widget lives on the customer's site; the job pages are the indexed version.
export const metadata: Metadata = { robots: { index: false } };

/**
 * Job list for embedding in a customer's website (iframe). Sets no cookies and
 * tracks nothing: links open the job page in a new tab, consent is asked there.
 */
export default async function Widget({ params }: Props) {
  const page = await getCareerPage((await params).slug).catch(() => null);
  if (!page) notFound();
  const t = getMessages().careers;
  const types = getMessages().briefing.options.employmentType;
  const color = page.brandColor ?? "#0a7f8c";

  return (
    <main style={{ "--c": color, "--c-fg": onColor(color) } as React.CSSProperties} className="flex flex-col gap-3 p-1">
      <style>{"body{background:transparent}"}</style>
      <Resizer />
      {page.jobs.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white p-4 text-ink/80">{t.noJobs}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {page.jobs.map((j) => (
            <li key={j.id}>
              <a
                href={`${jobPath(j)}?quelle=widget`}
                target="_blank"
                rel="noopener"
                className="group flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-[var(--c)] hover:shadow-sm"
              >
                <span className="flex flex-col gap-1">
                  <span className="font-semibold group-hover:underline">{j.title}</span>
                  <span className="text-sm text-ink/70">
                    {[j.remote ? getMessages().jobs.remote : j.location, j.employmentType ? types[j.employmentType] : null, salaryText(j.salaryMin, j.salaryMax, j.salaryPeriod)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--c)] text-[var(--c-fg)]">
                  <ArrowUpRight className="h-4 w-4" aria-label={t.view} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="text-right text-xs text-muted">
        <a href={`/karriere/${page.slug}`} target="_blank" rel="noopener" className="underline">{t.widgetAll}</a> · {t.poweredBy}
      </p>
    </main>
  );
}
