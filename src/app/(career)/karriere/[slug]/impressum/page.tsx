import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { usesCustomerImprint } from "@/lib/careers/imprint";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Impressum", robots: { index: false } };

/**
 * Imprint on a customer's own career domain (the middleware rewrites /impressum here).
 * Only when the domain is verified and the customer gave an imprint; otherwise projx's imprint applies.
 */
export default async function CustomerImprintPage({ params }: Props) {
  const { slug } = await params;
  const { data: o } = await createAdminClient()
    .from("organizations")
    .select("name, website, brand_color, career_domain, career_domain_verified_at, imprint, imprint_url")
    .eq("slug", slug)
    .eq("career_enabled", true)
    .maybeSingle();
  if (!o) notFound();
  const host = ((await headers()).get("host") ?? "").toLowerCase().replace(/:\d+$/, "");
  if (!usesCustomerImprint(o, host)) redirect(`${siteUrl()}/impressum`);
  if (!o.imprint && o.imprint_url) redirect(o.imprint_url);

  const color = o.brand_color ?? "#0a7f8c";
  return (
    <main className="min-h-screen bg-white text-ink">
      <header className="border-b border-neutral-200" style={{ borderTopColor: color, borderTopWidth: 4 }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-5">
          <Link href="/" className="font-display text-lg font-bold">{o.name}</Link>
          <Link href="/" className="text-sm underline underline-offset-4">Zur Karriereseite</Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 leading-relaxed">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Impressum</h1>
        <section className="whitespace-pre-line">{o.imprint}</section>
        {o.imprint_url && (
          <p>Ausführliche Angaben: <a href={o.imprint_url} rel="noopener" className="underline underline-offset-4">{o.imprint_url.replace(/^https:\/\//, "")}</a></p>
        )}
        <section className="rounded-2xl bg-neutral-50 p-5 text-sm text-ink/75">
          <h2 className="font-semibold text-ink">Technischer Betrieb</h2>
          <p className="mt-1">
            Karriereseite und Bewerbungsabwicklung werden im Auftrag von {o.name} technisch betrieben von recrewted, einem Angebot der projx GmbH, Landsberger Str. 72, 80339 München (
            <a href={`${siteUrl()}/impressum`} className="underline underline-offset-4">Impressum der projx GmbH</a>).
          </p>
        </section>
        <p className="text-sm"><a href="/datenschutz" className="underline underline-offset-4">Datenschutzerklärung</a></p>
      </div>
    </main>
  );
}
