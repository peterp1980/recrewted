"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Upload } from "lucide-react";
import { getMessages } from "@/i18n";
import type { Answer, QuestionKind } from "@/lib/assessments/model";
import { confirmTestUpload, logTestEvents, prepareTestUpload, saveTestAnswer, startTest, submitTest } from "@/app/test-actions";

export type RunnerQuestion = { id: string; kind: QuestionKind; prompt: string; caseText: string; options: string[] };
type Props = {
  token: string;
  tone: "sie" | "du";
  deadlineAt: string | null;
  /** Server time when the page was rendered, to correct a wrong clock on the device. */
  serverNow: number;
  questions: RunnerQuestion[];
  initial: Record<string, { answer: Answer; fileName: string | null }>;
};

export function StartButton({ token, label }: { token: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => { await startTest(token); router.refresh(); })} className="self-start rounded-xl bg-[var(--c)] px-6 py-3 font-semibold text-[var(--c-fg)] disabled:opacity-60">
      {label}
    </button>
  );
}

const input = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2";
const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function TestRunner({ token, tone, deadlineAt, serverNow, questions, initial }: Props) {
  const t = getMessages().assessment.candidate[tone];
  const yes = getMessages().assessment.yes;
  const no = getMessages().assessment.no;
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, Answer>>(Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v.answer])));
  const [files, setFiles] = useState<Record<string, string | null>>(Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v.fileName])));
  const [state, setState] = useState<Record<string, "saving" | "saved" | "offline" | "uploading" | "error">>({});
  const [left, setLeft] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const unsaved = useRef<Record<string, Answer>>({});
  const finishing = useRef(false);
  const queue = useRef<{ type: string; questionId: string | null }[]>([]);
  const current = useRef<string | null>(null);
  const skew = useRef(serverNow - Date.now());

  // Browser log: leaving the window, tab changes, copy/paste. Never the content.
  const track = useCallback((type: string) => queue.current.push({ type, questionId: current.current }), []);
  const flush = useCallback(async () => {
    if (queue.current.length === 0) return;
    const batch = queue.current.splice(0, 50);
    await logTestEvents(token, batch).catch(() => queue.current.unshift(...batch));
  }, [token]);
  useEffect(() => {
    const on = (type: string) => () => track(type);
    const vis = () => track(document.visibilityState === "hidden" ? "tab_hidden" : "tab_visible");
    const full = () => { if (!document.fullscreenElement) track("fullscreen_exit"); };
    const handlers: [EventTarget, string, EventListener][] = [
      [window, "blur", on("left_window")], [window, "focus", on("returned")], [document, "visibilitychange", vis],
      [document, "paste", on("paste")], [document, "copy", on("copy")], [document, "cut", on("cut")],
      [document, "contextmenu", on("context_menu")], [document, "fullscreenchange", full],
    ];
    for (const [el, ev, fn] of handlers) el.addEventListener(ev, fn);
    const iv = setInterval(() => void flush(), 5000);
    return () => { for (const [el, ev, fn] of handlers) el.removeEventListener(ev, fn); clearInterval(iv); };
  }, [track, flush]);

  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    start(async () => {
    // Answers still waiting for autosave are saved first, then the test is handed in.
    for (const h of Object.values(timers.current)) clearTimeout(h);
    await Promise.all(Object.entries(unsaved.current).map(([qid, v]) => saveTestAnswer(token, qid, v).catch(() => null)));
    unsaved.current = {};
    await flush();
    await submitTest(token);
    setDone(true);
    router.refresh();
    });
  }, [flush, router, token]);

  // Countdown, corrected by the server's clock. When time is up, the test is handed in.
  useEffect(() => {
    if (!deadlineAt) return;
    const end = Date.parse(deadlineAt);
    const tick = () => {
      const ms = end - (Date.now() + skew.current);
      setLeft(ms);
      if (ms <= 0) finish();
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [deadlineAt, finish]);

  const save = (qid: string, value: Answer) => {
    setAnswers((a) => ({ ...a, [qid]: value }));
    setState((s) => ({ ...s, [qid]: "saving" }));
    clearTimeout(timers.current[qid]);
    unsaved.current[qid] = value;
    timers.current[qid] = setTimeout(async () => {
      delete unsaved.current[qid];
      const r = await saveTestAnswer(token, qid, value).catch(() => null);
      if (r?.ok) setState((s) => ({ ...s, [qid]: "saved" }));
      else if (r && !r.ok && r.error === "closed") { setDone(true); router.refresh(); }
      else {
        unsaved.current[qid] ??= value; // retried when the test is handed in
        setState((s) => ({ ...s, [qid]: "offline" }));
      }
    }, 700);
  };

  const upload = async (qid: string, file: File) => {
    setState((s) => ({ ...s, [qid]: "uploading" }));
    const target = await prepareTestUpload(token, qid, file.type, file.size).catch(() => null);
    if (!target?.ok) return setState((s) => ({ ...s, [qid]: "error" }));
    const { createClient } = await import("@/lib/supabase/client");
    const { error } = await createClient().storage.from("assessment-uploads").uploadToSignedUrl(target.path, target.uploadToken, file, { contentType: file.type });
    const r = error ? null : await confirmTestUpload(token, qid, target.path, file.name).catch(() => null);
    if (!r?.ok) return setState((s) => ({ ...s, [qid]: "error" }));
    setFiles((f) => ({ ...f, [qid]: file.name }));
    setState((s) => ({ ...s, [qid]: "saved" }));
  };

  if (done) return <p className="card">{t.timeUp}</p>;

  return (
    <div className="flex flex-col gap-6">
      {left !== null && (
        <div className={`sticky top-2 z-10 flex items-center gap-2 self-end rounded-full px-4 py-2 font-semibold shadow-lg ${left < 60_000 ? "bg-red-600 text-white" : "bg-white text-ink"}`} role="timer" aria-live={left < 60_000 ? "assertive" : "off"}>
          <Clock className="h-4 w-4" aria-hidden="true" /> {t.timeLeft(fmt(left))}
        </div>
      )}
      <ol className="flex flex-col gap-5">
        {questions.map((q, i) => {
          const a = answers[q.id] ?? null;
          const st = state[q.id];
          return (
            <li key={q.id} className="card flex flex-col gap-3" onFocusCapture={() => (current.current = q.id)}>
              <p className="text-sm font-semibold text-muted">{i + 1} / {questions.length}</p>
              <h2 className="text-lg font-semibold whitespace-pre-line">{q.prompt}</h2>
              {q.kind === "case" && q.caseText && (
                <div className="rounded-xl bg-canvas p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">{t.caseLabel}</p>
                  <p className="mt-1 whitespace-pre-line">{q.caseText}</p>
                </div>
              )}
              {(q.kind === "yes_no" || q.kind === "single") && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="sr-only">{q.prompt}</legend>
                  {q.options.map((o) => (
                    <label key={o} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${a === o ? "border-[var(--c)] bg-white ring-2 ring-[var(--c)]" : "border-neutral-300 bg-white"}`}>
                      <input type="radio" name={q.id} checked={a === o} onChange={() => save(q.id, o)} />
                      {q.kind === "yes_no" ? (o === "yes" ? yes : no) : o}
                    </label>
                  ))}
                </fieldset>
              )}
              {q.kind === "multi" && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="sr-only">{q.prompt}</legend>
                  {q.options.map((o) => {
                    const list = Array.isArray(a) ? a : [];
                    const on = list.includes(o);
                    return (
                      <label key={o} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${on ? "border-[var(--c)] bg-white ring-2 ring-[var(--c)]" : "border-neutral-300 bg-white"}`}>
                        <input type="checkbox" checked={on} onChange={() => save(q.id, on ? list.filter((x) => x !== o) : [...list, o])} />
                        {o}
                      </label>
                    );
                  })}
                </fieldset>
              )}
              {(q.kind === "text" || q.kind === "case") && (
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{t.yourAnswer}</span>
                  <textarea value={typeof a === "string" ? a : ""} onChange={(e) => save(q.id, e.target.value)} rows={q.kind === "case" ? 10 : 5} maxLength={10000} className={input} />
                </label>
              )}
              {q.kind === "upload" && (
                <div className="flex flex-col gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 self-start rounded-xl border border-[var(--c)] bg-white px-4 py-2.5 font-semibold">
                    <Upload className="h-4 w-4" aria-hidden="true" /> {st === "uploading" ? t.uploading : t.upload}
                    <input type="file" className="sr-only" disabled={st === "uploading"} accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,image/png,image/jpeg" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(q.id, f); e.target.value = ""; }} />
                  </label>
                  <p className="text-xs text-muted">{t.uploadHint}</p>
                  {files[q.id] && <p className="text-sm font-medium text-emerald-700">{t.uploaded(files[q.id]!)}</p>}
                </div>
              )}
              <p aria-live="polite" className={`text-xs ${st === "offline" || st === "error" ? "text-red-700" : "text-muted"}`}>
                {st === "saving" ? t.saving : st === "saved" ? t.saved : st === "offline" ? t.offline : st === "error" ? t.uploadError : ""}
              </p>
            </li>
          );
        })}
      </ol>
      <button type="button" disabled={pending} onClick={() => window.confirm(t.confirm) && finish()} className="self-start rounded-xl bg-[var(--c)] px-6 py-3 font-semibold text-[var(--c-fg)] disabled:opacity-60">
        {t.submit}
      </button>
    </div>
  );
}
