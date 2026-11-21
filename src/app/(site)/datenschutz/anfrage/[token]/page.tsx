import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMessages } from "@/i18n";
import { deleteMyData } from "@/lib/privacy/actions";
import { verifyToken } from "@/lib/privacy/token";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Ihre Daten – recrewted", robots: { index: false } };

type Export = { candidate: Record<string, unknown> | null; applications: { job: string; submitted_at: string; status: string; cv_uploaded: boolean }[] };
const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

export default async function DataRequestTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const secret = process.env.DATA_REQUEST_SECRET;
  const id = secret ? verifyToken(token, secret) : null;
  if (!id) redirect("/datenschutz/anfrage?s=invalid");
  const t = getMessages().dataRequest;
  const { data } = await createAdminClient().rpc("candidate_export", { cand: id });
  const ex = data as Export | null;
  if (!ex?.candidate) redirect("/datenschutz/anfrage?s=invalid");
  const c = ex.candidate;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-10">
      <h1 className="text-2xl font-semibold">{t.yourData}</h1>
      <dl className="grid gap-1 rounded-2xl bg-white p-4 sm:grid-cols-[auto_1fr] sm:gap-x-6">
        {(["first_name", "last_name", "email", "phone", "talent_pool_consent_at", "created_at"] as const).map((k) => (
          <div key={k} className="contents"><dt className="font-medium">{k}</dt><dd>{String(c[k] ?? "–")}</dd></div>
        ))}
      </dl>
      <ul className="flex flex-col gap-2">
        {ex.applications.map((a, i) => (
          <li key={i} className="rounded-2xl border border-neutral-200 bg-white p-3">{a.job} · {fmt.format(new Date(a.submitted_at))} · {a.status}{a.cv_uploaded ? " · Lebenslauf" : ""}</li>
        ))}
      </ul>
      <a href={`/api/data-request/${token}`} className="self-start rounded-lg border border-neutral-300 px-4 py-2 hover:bg-brand-50">{t.download}</a>
      <form action={deleteMyData} className="flex flex-col gap-2 rounded-lg border border-red-200 p-4">
        <input type="hidden" name="token" value={token} />
        <p className="text-ink/80">{t.deleteHint}</p>
        <button type="submit" className="self-start rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800">{t.delete}</button>
      </form>
    </main>
  );
}
