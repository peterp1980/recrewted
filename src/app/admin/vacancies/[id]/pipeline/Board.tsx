"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { getMessages } from "@/i18n";
import { MANUAL_STATUSES, PIPELINE, type ApplicationStatus } from "@/lib/applications/status";
import { scoreText } from "@/lib/scorecard/ratings";
import { moveApplication } from "@/app/application-actions";

export type Card = { id: string; name: string; status: ApplicationStatus; score: number | null; submittedAt: string };

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeZone: "Europe/Berlin" });

/** Kanban per vacancy (F5). Drag and drop, or the menu on each card (keyboard and touch). */
export function Board({ cards }: { cards: Card[] }) {
  const m = getMessages();
  const t = m.pipeline;
  const [optimistic, setOptimistic] = useOptimistic(cards, (state, move: { id: string; status: ApplicationStatus }) =>
    state.map((c) => (c.id === move.id ? { ...c, status: move.status } : c)),
  );
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [, start] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);

  const move = (id: string, status: ApplicationStatus) =>
    start(async () => {
      setOptimistic({ id, status });
      const r = await moveApplication(id, status);
      setMessage(r.ok ? { kind: "ok", text: t.moved } : { kind: "error", text: r.error === "incomplete" ? t.incomplete : t.error });
    });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t.hint}</p>
      <p aria-live="polite" role="status" className={message?.kind === "error" ? "text-red-800" : "text-emerald-800"}>{message?.text}</p>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE.map((col) => {
          const items = optimistic.filter((c) => c.status === col);
          const droppable = MANUAL_STATUSES.includes(col);
          return (
            <section
              key={col}
              aria-label={m.applications.status[col]}
              onDragOver={(e) => droppable && e.preventDefault()}
              onDrop={() => droppable && dragId && move(dragId, col)}
              className="flex w-60 shrink-0 flex-col gap-2 rounded-lg bg-brand-50 p-2"
            >
              <h2 className="px-1 text-sm font-semibold">{m.applications.status[col]} <span className="font-normal text-neutral-500">({items.length})</span></h2>
              {items.map((c) => (
                <article
                  key={c.id}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  onDragEnd={() => setDragId(null)}
                  className="flex cursor-grab flex-col gap-1 rounded-2xl border border-neutral-200 bg-white bg-white p-2 text-sm shadow-sm"
                >
                  <Link href={`/admin/applications/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                  <span className="text-muted">{scoreText(c.score)} · {fmt.format(new Date(c.submittedAt))}</span>
                  <label className="flex items-center gap-1 text-xs text-muted">
                    <span className="sr-only">{t.move}</span>
                    <select
                      value=""
                      onChange={(e) => e.target.value && move(c.id, e.target.value as ApplicationStatus)}
                      className="w-full rounded border border-neutral-300 px-1 py-0.5"
                      aria-label={`${c.name}: ${t.move}`}
                    >
                      <option value="">{t.move} …</option>
                      {MANUAL_STATUSES.filter((s) => s !== c.status).map((s) => <option key={s} value={s}>{m.applications.status[s]}</option>)}
                    </select>
                  </label>
                </article>
              ))}
              {items.length === 0 && <p className="px-1 text-neutral-400">{t.empty}</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
