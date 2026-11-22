import { ArrowUpRight } from "lucide-react";
import { externalConfigured, externalJobs } from "@/lib/external/jobs";
import { featureOn } from "@/lib/imports/run";

const SOURCE = { adzuna: { name: "Adzuna", url: "https://www.adzuna.de" }, jooble: { name: "Jooble", url: "https://de.jooble.org" } } as const;

/**
 * Partner jobs under our own results: clearly external, with attribution, links go to the partner.
 * Not part of Google for Jobs, feeds, sitemap or llms.txt; data-nosnippet keeps them out of search snippets.
 */
export async function ExternalJobs({ q, where, radius }: { q: string; where: string; radius: number }) {
  const c = externalConfigured();
  if ((!c.adzuna && !c.jooble) || !(await featureOn("external_jobs").catch(() => false))) return null;
  const jobs = await externalJobs(q, where, radius);
  if (!jobs.length) return null;
  const used = [...new Set(jobs.map((j) => j.source))];
  return (
    <section aria-labelledby="ext-h" data-nosnippet className="flex flex-col gap-4 border-t border-neutral-200 pt-8">
      <div>
        <h2 id="ext-h" className="font-display text-xl font-bold">Weitere Stellen von Partnern</h2>
        <p className="text-sm text-muted">Diese Anzeigen stammen nicht von recrewted. Die Bewerbung läuft beim jeweiligen Anbieter, nicht über unsere Kurzbewerbung.</p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {jobs.map((j) => (
          <li key={j.id}>
            <a href={j.url} target="_blank" rel="nofollow noopener noreferrer sponsored" className="group flex h-full flex-col gap-2 rounded-2xl border border-dashed border-neutral-300 bg-white p-5 transition hover:border-neutral-400">
              <span className="flex items-start justify-between gap-3">
                <span className="font-semibold group-hover:underline">{j.title}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              </span>
              <span className="text-sm text-ink/70">{[j.company, j.location, j.salary].filter(Boolean).join(" · ")}</span>
              {j.snippet && <span className="line-clamp-2 text-sm text-muted">{j.snippet}</span>}
              <span className="mt-auto text-xs text-muted">Quelle: {SOURCE[j.source].name} · öffnet in neuem Fenster</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        {used.map((s, i) => (
          <span key={s}>{i ? " · " : ""}Jobs by <a href={SOURCE[s].url} target="_blank" rel="nofollow noopener noreferrer" className="underline">{SOURCE[s].name}</a></span>
        ))}
      </p>
    </section>
  );
}
