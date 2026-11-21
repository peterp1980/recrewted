import Link from "next/link";
import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { requireAccess } from "@/lib/auth/session";
import { benefitsFromStored, benefitsToText, CAREER_BUCKET, embedCode, factsFromStored, factsToText, testimonialsFromStored, testimonialsToText, toSlug } from "@/lib/careers/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import { saveCareerProfile, uploadCareerImage } from "../actions";

export const metadata = { title: "Unternehmen – recrewted" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; error?: string }> };

const field = "rounded-lg border border-neutral-300 px-3 py-2";

export default async function OrganizationPage({ params, searchParams }: Props) {
  const [{ id }, { status, error }] = await Promise.all([params, searchParams]);
  const session = await requireAccess(`/admin/organizations/${id}`);
  const t = getMessages().organizations;
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, website, slug, career_enabled, career_headline, career_intro, career_benefits, career_office, career_contact, brand_color, candidate_tone, career_logo_url, career_hero_url, career_facts, career_testimonials, vacancies(id, title, status)")
    .eq("id", id)
    .maybeSingle();
  if (!org) notFound();

  const base = siteUrl();
  // Images of this customer in the public bucket, newest first.
  const storage = createAdminClient().storage.from(CAREER_BUCKET);
  const { data: files } = await storage.list(org.id, { limit: 50, sortBy: { column: "created_at", order: "desc" } });
  const images = (files ?? []).filter((f) => f.id).map((f) => storage.getPublicUrl(`${org.id}/${f.name}`).data.publicUrl);
  const errorText = error && error in t.errors ? t.errors[error as keyof typeof t.errors] : null;
  const readOnly = session.role !== "admin";
  const statusText: Record<string, string> = getMessages().vacancy.status;
  const vacancies = (org.vacancies ?? []) as { id: string; title: string; status: string }[];

  return (
    <main className="flex flex-col gap-8">
      <div>
        <Link href="/admin/organizations" className="text-sm underline">{t.back}</Link>
        <h1 className="mt-2 text-2xl font-semibold">{org.name}</h1>
        {org.website && <a href={org.website} rel="noopener" className="text-sm text-muted underline">{org.website}</a>}
      </div>

      {(status === "saved" || status === "created" || status === "uploaded" || errorText) && (
        <p role={errorText ? "alert" : "status"} className={`rounded-lg p-4 ${errorText ? "bg-red-50 text-red-900" : "bg-emerald-50 text-emerald-900"}`}>
          {errorText ?? (status === "created" ? t.created : status === "uploaded" ? t.uploaded : t.saved)}
        </p>
      )}

      {vacancies.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t.vacancies(vacancies.length)}</h2>
          <ul className="flex flex-col gap-1">
            {vacancies.map((v) => (
              <li key={v.id}><Link href={`/admin/vacancies/${v.id}`} className="underline">{v.title}</Link> <span className="text-sm text-muted">· {statusText[v.status] ?? v.status}</span></li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="links" className="card flex flex-col gap-4">
        <h2 id="links" className="text-lg font-semibold">{t.links}</h2>
        {org.career_enabled && org.slug ? (
          <>
            <p>
              <a href={`/karriere/${org.slug}`} target="_blank" rel="noopener" className="btn-secondary py-2">{t.openPage}</a>
            </p>
            <label className="grid gap-1">
              <span className="font-medium">{t.link}</span>
              <input readOnly value={`${base}/karriere/${org.slug}`} className={`${field} font-mono text-sm`} />
            </label>
            <label className="grid gap-1">
              <span className="font-medium">{t.embed}</span>
              <span className="text-sm text-muted">{t.embedHint}</span>
              <textarea readOnly rows={5} value={embedCode(base, org.slug, org.name)} className={`${field} font-mono text-xs`} />
            </label>
          </>
        ) : (
          <p className="text-muted">{t.notPublished}</p>
        )}
      </section>

      <form action={saveCareerProfile} className="card grid gap-4">
        <h2 className="text-lg font-semibold">{t.profile}</h2>
        <input type="hidden" name="organizationId" value={org.id} />
        <fieldset disabled={readOnly} className="grid gap-4">
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" name="enabled" defaultChecked={org.career_enabled} /> {t.enabled}
          </label>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <label className="grid gap-1">
              <span className="font-medium">{t.slug}</span>
              <span className="text-sm text-muted">{t.slugHint}</span>
              <input name="slug" defaultValue={org.slug ?? toSlug(org.name.replace(/\b(gmbh|ag|kg|ug|se|e\.?\s?k\.?)\b/gi, ""))} pattern="[a-z0-9](?:[a-z0-9\-]{0,58}[a-z0-9])?" className={field} />
            </label>
            <label className="grid gap-1">
              <span className="font-medium">{t.brandColor}</span>
              <span className="text-sm text-muted">#RRGGBB</span>
              <input name="brandColor" defaultValue={org.brand_color ?? ""} placeholder="#0a7f8c" className={field} />
            </label>
          </div>
          <fieldset className="grid gap-1">
            <legend className="font-medium">{t.tone}</legend>
            <span className="text-sm text-muted">{t.toneHint}</span>
            <div className="mt-1 flex gap-6">
              <label className="flex items-center gap-2"><input type="radio" name="tone" value="sie" defaultChecked={org.candidate_tone !== "du"} /> {t.toneSie}</label>
              <label className="flex items-center gap-2"><input type="radio" name="tone" value="du" defaultChecked={org.candidate_tone === "du"} /> {t.toneDu}</label>
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="font-medium">{t.logoUrl}</span>
              <span className="text-sm text-muted">{t.imageHint}</span>
              <input name="logoUrl" defaultValue={org.career_logo_url ?? ""} className={`${field} text-sm`} />
            </label>
            <label className="grid gap-1">
              <span className="font-medium">{t.heroUrl}</span>
              <span className="text-sm text-muted">{t.imageHint}</span>
              <input name="heroUrl" defaultValue={org.career_hero_url ?? ""} className={`${field} text-sm`} />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="font-medium">{t.headline}</span>
            <input name="headline" defaultValue={org.career_headline ?? ""} maxLength={150} className={field} />
          </label>
          <label className="grid gap-1">
            <span className="font-medium">{t.intro}</span>
            <textarea name="intro" defaultValue={org.career_intro ?? ""} rows={5} maxLength={2000} className={field} />
          </label>
          <label className="grid gap-1">
            <span className="font-medium">{t.benefits}</span>
            <span className="text-sm text-muted">{t.benefitsHint}</span>
            <textarea name="benefits" defaultValue={benefitsToText(benefitsFromStored(org.career_benefits))} rows={6} className={field} />
          </label>
          <label className="grid gap-1">
            <span className="font-medium">{t.facts}</span>
            <span className="text-sm text-muted">{t.factsHint}</span>
            <textarea name="facts" defaultValue={factsToText(factsFromStored(org.career_facts))} rows={4} className={field} />
          </label>
          <label className="grid gap-1">
            <span className="font-medium">{t.testimonials}</span>
            <span className="text-sm text-muted">{t.testimonialsHint}</span>
            <textarea name="testimonials" defaultValue={testimonialsToText(testimonialsFromStored(org.career_testimonials))} rows={8} className={`${field} text-sm`} />
          </label>
          <label className="grid gap-1">
            <span className="font-medium">{t.office}</span>
            <textarea name="office" defaultValue={org.career_office ?? ""} rows={3} maxLength={1000} className={field} />
          </label>
          <label className="grid gap-1">
            <span className="font-medium">{t.contact}</span>
            <textarea name="contact" defaultValue={org.career_contact ?? ""} rows={2} maxLength={300} className={field} />
          </label>
          <button type="submit" className="btn-primary self-start">{t.save}</button>
        </fieldset>
        {readOnly && <p className="text-sm text-muted">{t.errors.forbidden}</p>}
      </form>

      <section id="bilder" aria-labelledby="bilder-h" className="card flex scroll-mt-20 flex-col gap-4">
        <h2 id="bilder-h" className="text-lg font-semibold">{t.images}</h2>
        <p className="text-sm text-muted">{t.imagesHint}</p>
        {!readOnly && (
          <form action={uploadCareerImage} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="organizationId" value={org.id} />
            <input type="file" name="file" required accept="image/jpeg,image/png,image/webp" />
            <button type="submit" className="btn-secondary py-2">{t.upload}</button>
          </form>
        )}
        {images.length === 0 ? (
          <p className="text-muted">{t.noImages}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((url) => (
              <li key={url} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file */}
                <img src={url} alt="" className="h-32 w-full rounded-lg bg-canvas object-contain" />
                <input readOnly value={url} className="w-full rounded-md border border-neutral-200 px-2 py-1 font-mono text-[11px]" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
