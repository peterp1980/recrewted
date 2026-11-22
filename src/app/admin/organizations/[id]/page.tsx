import { ContractsSection } from "@/components/ContractsSection";
import { FairnessSettings } from "@/components/FairnessSettings";
import { AiSwitches } from "@/components/AiSwitches";
import { AtsSection } from "@/components/AtsSection";
import { TeamSection } from "@/components/TeamSection";
import { ReferralsSection } from "@/components/ReferralsSection";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getMessages } from "@/i18n";
import { requireAccess } from "@/lib/auth/session";
import { embedCode, toSlug } from "@/lib/careers/profile";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import { saveCareerSettings } from "../actions";
import { dnsRecord } from "@/lib/careers/domain";
import { domainStatus } from "@/lib/careers/vercel";
import { syncDomainVerification } from "@/lib/careers/verify-domain";

export const metadata = { title: "Unternehmen – recrewted" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; error?: string; r?: string; ats?: string; msg?: string; field?: string; team?: string; ki?: string; fair?: string; vt?: string; vtd?: string }> };

const field = "rounded-lg border border-neutral-300 px-3 py-2";

export default async function OrganizationPage({ params, searchParams }: Props) {
  const [{ id }, { status, error, r, ats, msg, field: atsField, team, ki, fair, vt, vtd }] = await Promise.all([params, searchParams]);
  const session = await requireAccess(`/admin/organizations/${id}`);
  const t = getMessages().organizations;
  const e = getMessages().editor;
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, website, slug, career_enabled, brand_color, candidate_tone, career_domain, career_domain_verified_at, imprint, imprint_url, weekly_report, ai_assist, ai_scoring, blind_review, career_pages(status, published_at), vacancies(id, title, status)")
    .eq("id", id)
    .maybeSingle();
  if (!org) notFound();

  const base = siteUrl();
  const errors: Record<string, string> = t.errors;
  const errorText = error ? errors[error] ?? null : null;
  const okText = status === "created" ? t.created : status === "saved" ? t.saved : null;
  const readOnly = session.role !== "admin";
  const statusText: Record<string, string> = getMessages().vacancy.status;
  const vacancies = (org.vacancies ?? []) as { id: string; title: string; status: string }[];
  const page = org.career_pages as unknown as { status: string; published_at: string | null } | null;

  return (
    <main className="flex flex-col gap-8">
      <div>
        <Link href="/admin/organizations" className="text-sm underline">{t.back}</Link>
        <h1 className="mt-2 text-2xl font-semibold">{org.name}</h1>
        {org.website && <a href={org.website} rel="noopener" className="text-sm text-muted underline">{org.website}</a>}
      </div>

      {(okText || errorText) && (
        <p role={errorText ? "alert" : "status"} className={`rounded-lg p-4 ${errorText ? "bg-red-50 text-red-900" : "bg-emerald-50 text-emerald-900"}`}>{errorText ?? okText}</p>
      )}

      <section className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t.profile}</h2>
          <p className="text-sm text-muted">{page ? e.status[page.status] : e.status.draft}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/reports/weekly?org=${org.id}`} className="btn-secondary">{getMessages().reports.download}</a>
          <Link href={`/admin/organizations/${org.id}/karriereseite`} className="btn-primary"><Pencil className="h-4 w-4" aria-hidden="true" /> {e.open}</Link>
        </div>
      </section>

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

      <form action={saveCareerSettings} className="card grid gap-4">
        <h2 className="text-lg font-semibold">{t.settings}</h2>
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
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" name="weeklyReport" defaultChecked={org.weekly_report} /> {getMessages().reports.setting}
          </label>
          <label className="grid gap-1">
            <span className="font-medium">{t.domain}</span>
            <span className="text-sm text-muted">{t.domainHint}</span>
            <input name="domain" defaultValue={org.career_domain ?? ""} placeholder="karriere.beispiel.de" inputMode="url" autoCapitalize="none" spellCheck={false} className={field} />
          </label>
          <fieldset className="grid gap-3 rounded-xl border border-neutral-200 p-4">
            <legend className="px-1 font-medium">{t.imprint}</legend>
            <span className="text-sm text-muted">{t.imprintHint}</span>
            <label className="grid gap-1">
              <span className="text-sm font-medium">{t.imprintText}</span>
              <textarea name="imprint" rows={6} defaultValue={org.imprint ?? ""} maxLength={5000} placeholder={"Muster GmbH\nMusterstraße 1\n80331 München\nVertreten durch: …\nTelefon: … · E-Mail: …\nRegistergericht: … · HRB …\nUSt-IdNr.: DE …"} className={field} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">{t.imprintUrl}</span>
              <input name="imprintUrl" defaultValue={org.imprint_url ?? ""} placeholder="https://www.beispiel.de/impressum" inputMode="url" className={field} />
            </label>
          </fieldset>
          <button type="submit" className="btn-primary self-start">{t.save}</button>
        </fieldset>
        {readOnly && <p className="text-sm text-muted">{t.errors.forbidden}</p>}
      </form>

      {org.career_domain && <DnsBox organizationId={org.id} domain={org.career_domain} hasImprint={Boolean(org.imprint || org.imprint_url)} />}

      <section aria-labelledby="links" className="card flex flex-col gap-4">
        <h2 id="links" className="text-lg font-semibold">{t.links}</h2>
        {org.career_enabled && org.slug ? (
          <>
            <p><a href={`/karriere/${org.slug}`} target="_blank" rel="noopener" className="btn-secondary py-2">{t.openPage}</a></p>
            <label className="grid gap-1">
              <span className="font-medium">{t.link}</span>
              <input readOnly value={org.career_domain ? `https://${org.career_domain}` : `${base}/karriere/${org.slug}`} className={`${field} font-mono text-sm`} />
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

      <ContractsSection organizationId={org.id} status={vt} detail={vtd} />
      <FairnessSettings organizationId={org.id} blindReview={org.blind_review} canChange status={fair} />
      <AiSwitches organizationId={org.id} assist={org.ai_assist} scoring={org.ai_scoring} status={ki} />
      <TeamSection organizationId={org.id} from="admin" status={team} canManage viewerId={session.userId} />
      <AtsSection organizationId={org.id} from="admin" status={ats} msg={msg} field={atsField} />
      <ReferralsSection organizationId={org.id} from="admin" status={r} />
    </main>
  );
}

/** What the customer has to set at their DNS provider, and whether it works yet. */
async function DnsBox({ organizationId, domain, hasImprint }: { organizationId: string; domain: string; hasImprint: boolean }) {
  const t = getMessages().organizations;
  const rec = dnsRecord(domain);
  const [status, reaches] = await Promise.all([domainStatus(domain), syncDomainVerification(organizationId, domain)]);
  const verifiedText = reaches
    ? hasImprint
      ? t.domainVerified(new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date()))
      : t.domainVerifiedNoImprint
    : t.domainUnverified;
  const tone = reaches || status.state === "ok" ? "bg-emerald-50 text-emerald-900" : status.state === "unknown" ? "bg-neutral-100 text-ink/80" : "bg-amber-50 text-amber-900";
  const rows = [rec, ...status.verification.map((v) => ({ type: v.type, name: v.domain, value: v.value }))];
  return (
    <section aria-labelledby="dns-h" className="card flex flex-col gap-4">
      <h2 id="dns-h" className="text-lg font-semibold">{t.dns}</h2>
      <p role="status" className={`rounded-lg p-3 text-sm font-medium ${tone}`}>{t.domainState[reaches ? "ok" : status.state]}</p>
      <p className={`rounded-lg p-3 text-sm ${reaches && hasImprint ? "bg-emerald-50 text-emerald-900" : "bg-neutral-100 text-ink/80"}`}>{verifiedText}</p>
      <p className="text-ink/80">{t.dnsLead(domain)}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="text-muted"><tr><th className="py-2 pr-4 font-medium">{t.dnsType}</th><th className="py-2 pr-4 font-medium">{t.dnsName}</th><th className="py-2 font-medium">{t.dnsValue}</th></tr></thead>
          <tbody className="font-mono">
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-neutral-200">
                <td className="py-2 pr-4">{r.type}</td>
                <td className="py-2 pr-4">{r.name}</td>
                <td className="py-2 break-all">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {status.verification.length > 0 && <p className="text-sm text-muted">{t.dnsVerify}</p>}
      <p className="text-sm text-muted">{t.dnsNote}</p>
    </section>
  );
}
