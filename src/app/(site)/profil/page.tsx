import type { Metadata } from "next";
import { getMessages } from "@/i18n";
import { Notice } from "@/components/Notice";
import { requestProfileLink } from "@/app/profile-actions";

export const metadata: Metadata = { title: "Bewerberprofil – recrewted", robots: { index: false } };

export default async function ProfileRequestPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const t = getMessages().profile;
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-14">
      <h1 className="text-3xl font-bold">{t.title}</h1>
      {s === "sent" && <Notice kind="ok">{t.sent}</Notice>}
      {s === "invalid" && <Notice kind="error">{t.invalid}</Notice>}
      {s === "expired" && <Notice kind="info">{t.expired}</Notice>}
      <p className="text-ink/80">{t.requestLead}</p>
      <form action={requestProfileLink} className="card flex flex-col gap-3">
        <div aria-hidden="true" className="hidden"><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <label className="grid gap-1">
          <span className="font-medium">{t.email}</span>
          <input name="email" type="email" required autoComplete="email" className="rounded-lg border border-neutral-300 px-3 py-3" />
        </label>
        <button type="submit" className="btn-primary self-start">{t.request}</button>
      </form>
    </main>
  );
}
