import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { getMessages } from "@/i18n";
import { attemptByToken } from "@/lib/assessments/server";
import { GRACE_SECONDS } from "@/lib/assessments/model";
import { finalizeAttempt } from "@/lib/assessments/server";
import { onColor } from "@/lib/careers/profile";
import { StartButton, TestRunner, type RunnerQuestion } from "./TestRunner";

export const metadata: Metadata = { title: "Test – recrewted", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

/** Candidate test page. Reached only through the personal link from the invitation. */
export default async function TestPage({ params }: Props) {
  const { token } = await params;
  let a = await attemptByToken(token);
  const all = getMessages().assessment.candidate;

  // A test left open past its deadline is closed with the answers saved so far.
  if (a?.status === "started" && a.deadlineAt && Date.now() > Date.parse(a.deadlineAt) + GRACE_SECONDS * 1000) {
    await finalizeAttempt(a);
    a = await attemptByToken(token);
  }
  const t = all[a?.tone ?? "sie"];
  const color = a?.color ?? "#0a7f8c";

  return (
    <div style={{ "--c": color, "--c-fg": onColor(color) } as React.CSSProperties} className="min-h-screen bg-canvas">
      <header className="bg-[var(--c)] text-[var(--c-fg)]">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {a && <p className="text-sm font-semibold opacity-80">{[a.employer, a.jobTitle].filter(Boolean).join(" · ")}</p>}
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{a?.title ?? "Test"}</h1>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        {!a ? (
          <p className="card">{t.invalid}</p>
        ) : a.status === "submitted" ? (
          <section className="card flex flex-col items-start gap-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
            <h2 className="text-xl font-bold">{t.done}</h2>
            <p className="text-ink/80">{t.doneText}</p>
          </section>
        ) : a.status === "sent" ? (
          <section className="card flex flex-col gap-4">
            {a.intro && <p className="whitespace-pre-line text-ink/80">{a.intro}</p>}
            <ul className="flex list-disc flex-col gap-1 pl-5 text-ink/80">
              <li>{t.intro(a.questions.length)}</li>
              <li>{a.minutes ? t.limit(a.minutes) : t.noLimit}</li>
            </ul>
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{t.privacy}</p>
            <StartButton token={token} label={t.start} />
          </section>
        ) : (
          <TestRunner
            token={token}
            tone={a.tone}
            deadlineAt={a.deadlineAt}
            serverNow={Date.now()}
            // Correct answers stay on the server.
            questions={a.questions.map((q): RunnerQuestion => ({ id: q.id, kind: q.kind, prompt: q.prompt, caseText: q.caseText, options: q.options }))}
            initial={a.answers}
          />
        )}
        <p className="text-center text-xs text-muted">recrewted · <a href="/datenschutz" className="underline">Datenschutz</a></p>
      </main>
    </div>
  );
}
