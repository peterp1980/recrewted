import { getMessages } from "@/i18n";
import { RATING_LABELS, scoreText } from "@/lib/scorecard/ratings";
import type { ScorecardData } from "@/lib/scorecard/load";

/** Read-only scorecard, as the customer sees it (F4/F14). */
export function ScorecardView({ data, pdfHref }: { data: ScorecardData; pdfHref?: string }) {
  const t = getMessages().scorecard;
  return (
    <section aria-labelledby="sc-h" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="sc-h" className="text-xl font-semibold">{t.title}</h2>
        <p className="text-lg"><span className="text-muted">{t.total}:</span> <strong>{scoreText(data.score)}</strong></p>
      </div>
      <ul className="flex flex-col gap-3">
        {data.criteria.map((c) => (
          <li key={c.id} className="rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{c.name} <span className="text-sm font-normal text-neutral-500">({t.weight} {c.weight})</span></p>
              <p aria-label={c.rating ? `${c.rating} von 5` : t.notRated} className="whitespace-nowrap">
                {c.rating ? <><span aria-hidden="true">{"●".repeat(c.rating)}<span className="text-neutral-300">{"●".repeat(5 - c.rating)}</span></span> <span className="text-sm text-muted">{RATING_LABELS[c.rating]}</span></> : <span className="text-sm text-neutral-500">{t.notRated}</span>}
              </p>
            </div>
            {c.reason && <p className="mt-1 text-ink/80">{c.reason}</p>}
          </li>
        ))}
      </ul>
      {pdfHref && <a href={pdfHref} className="self-start rounded-lg border border-neutral-300 px-4 py-2 hover:bg-brand-50">{t.pdf}</a>}
    </section>
  );
}
