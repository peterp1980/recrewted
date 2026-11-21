import type { Metadata } from "next";
import { getMessages } from "@/i18n";
import { Notice } from "@/components/Notice";
import { requestDataLink } from "@/lib/privacy/actions";

export const metadata: Metadata = { title: "Auskunft oder Löschung – recrewted", robots: { index: false } };

export default async function DataRequestPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const t = getMessages().dataRequest;
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      {s === "sent" && <Notice kind="ok">{t.sent}</Notice>}
      {s === "deleted" && <Notice kind="ok">{t.deleted}</Notice>}
      {s === "invalid" && <Notice kind="error">{t.invalid}</Notice>}
      {s === "unavailable" && <Notice kind="error">{t.unavailable}</Notice>}
      <p className="text-ink/80">{t.lead}</p>
      <form action={requestDataLink} className="flex flex-col gap-3">
        <label className="grid gap-1"><span className="font-medium">{t.email}</span>
          <input name="email" type="email" required autoComplete="email" className="rounded-lg border border-neutral-300 px-3 py-2" />
        </label>
        <button type="submit" className="self-start rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">{t.submit}</button>
      </form>
      <p className="text-sm text-muted">{t.phoneOnly}</p>
    </main>
  );
}
