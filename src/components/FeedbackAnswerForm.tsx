"use client";

import { useState } from "react";
import type { FeedbackTemplate } from "@/lib/feedback/templates";

/** Picks a template into the text field; the text stays editable. Sending is a server action. */
export function FeedbackAnswerForm({ applicationId, templates, initial, action, send }: {
  applicationId: string;
  templates: FeedbackTemplate[];
  initial: string;
  action: (form: FormData) => void | Promise<void>;
  send: string;
}) {
  const [chosen, setChosen] = useState(initial);
  const [text, setText] = useState(templates.find((t) => t.id === initial)?.text ?? "");
  const [edited, setEdited] = useState(false);
  const choose = (id: string) => {
    if (edited && !window.confirm("Den geänderten Text durch die Vorlage ersetzen?")) return;
    setChosen(id);
    setText(templates.find((t) => t.id === id)?.text ?? "");
    setEdited(false);
  };
  const current = templates.find((t) => t.id === chosen);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="template" value={chosen} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Vorlage</legend>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <label key={t.id} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition ${chosen === t.id ? "border-brand-700 bg-brand-50 font-semibold text-brand-800" : "border-neutral-300 hover:border-brand-300"}`}>
              <input type="radio" name="templateChoice" value={t.id} checked={chosen === t.id} onChange={() => choose(t.id)} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
        {current && <p className="text-sm text-muted">{current.hint}</p>}
      </fieldset>
      <textarea
        name="answer"
        rows={8}
        minLength={20}
        maxLength={3000}
        value={text}
        onChange={(e) => { setText(e.target.value); setEdited(true); }}
        className="rounded-lg border border-neutral-300 px-3 py-2"
      />
      {/\[[^\]]+\]/.test(text) && <p className="text-sm text-amber-800">Der Text enthält noch einen Platzhalter in eckigen Klammern.</p>}
      <button type="submit" disabled={/\[[^\]]+\]/.test(text)} className="self-start rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800 disabled:opacity-50">{send}</button>
    </form>
  );
}
