import type { Metadata } from "next";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site";
import { sendContactRequest } from "@/lib/contact-actions";
import { Notice } from "@/components/Notice";

const t = site.contact;
export const metadata: Metadata = { title: `${t.title} – recrewted`, description: t.lead, alternates: { canonical: `${siteUrl()}/kontakt` } };
const input = "w-full rounded-md border border-neutral-400 px-3 py-2 text-base";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-12">
      <h1 className="text-3xl font-semibold">{t.title}</h1>
      <p className="text-neutral-700">{t.lead}</p>
      {s === "sent" && <Notice kind="ok">{t.sent}</Notice>}
      {s === "invalid" && <Notice kind="error">{t.invalid}</Notice>}
      <form action={sendContactRequest} className="flex flex-col gap-3">
        <div aria-hidden="true" className="hidden"><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <label className="grid gap-1"><span>{t.name}</span><input name="name" required autoComplete="name" className={input} /></label>
        <label className="grid gap-1"><span>{t.company}</span><input name="company" autoComplete="organization" className={input} /></label>
        <label className="grid gap-1"><span>{t.email}</span><input name="email" type="email" required autoComplete="email" className={input} /></label>
        <label className="grid gap-1"><span>{t.phone}</span><input name="phone" type="tel" autoComplete="tel" className={input} /></label>
        <label className="grid gap-1"><span>{t.message}</span><textarea name="message" required rows={5} maxLength={3000} className={input} /></label>
        <label className="flex items-start gap-3"><input type="checkbox" name="consent" required className="mt-1 h-5 w-5 shrink-0" /><span className="text-sm text-neutral-700">{t.consent}</span></label>
        <button type="submit" className="self-start rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700">{t.submit}</button>
      </form>
    </main>
  );
}
