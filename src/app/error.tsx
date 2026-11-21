"use client";

/** Shown when a page fails. The error itself is logged on the server (instrumentation.ts). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Da ist etwas schiefgegangen.</h1>
      <p className="text-neutral-700">Bitte versuchen Sie es noch einmal. Wenn es wieder passiert, schreiben Sie uns und nennen diese Kennung: <code>{error.digest ?? "–"}</code></p>
      <button type="button" onClick={reset} className="self-start rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700">Noch einmal versuchen</button>
    </main>
  );
}
