import Link from "next/link";
import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { fromStored, type BriefingField } from "@/lib/briefing/schema";
import { flaggedItems, suggestCriteria, suggestQuestions } from "@/lib/briefing/suggestions";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";
import { applySuggestions } from "@/app/vacancy-actions";
import { BriefingForm } from "./BriefingForm";
import { Notice } from "./Notice";
import { QuestionEditor } from "./QuestionEditor";
import { CriteriaEditor } from "./CriteriaEditor";
import { AssessmentEditor } from "./AssessmentEditor";
import { VacancySettings } from "./VacancySettings";
import { CampaignsSection } from "./CampaignsSection";
import { AdsSection } from "./AdsSection";
import { DistributionSection } from "./DistributionSection";
import { PortalVacancySections } from "./PortalVacancySections";
import { ApplicationsList } from "./ApplicationsList";
import { getSession } from "@/lib/auth/session";

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
const EDITABLE_FOR_CUSTOMER = ["draft", "contract_pending"];

type Props = {
  id: string;
  base: "/admin" | "/portal";
  staff: boolean;
  search: { status?: string; missing?: string; q?: string; c?: string; k?: string; a?: string; t?: string };
};

/** Vacancy page with briefing (F13). Staff additionally see suggestions and can apply them. */
export async function VacancyDetail({ id, base, staff, search }: Props) {
  if (!isUuid(id)) notFound();
  const m = getMessages();
  const t = m.briefing;

  const supabase = await createClient();
  const { data: vacancy } = await supabase
    .from("vacancies")
    .select("id, title, status, organizations(name), vacancy_briefings(data, submitted_at)")
    .eq("id", id)
    .maybeSingle();
  if (!vacancy) notFound(); // also when RLS hides it

  const briefing = fromStored(vacancy.vacancy_briefings?.data);
  const submittedAt = vacancy.vacancy_briefings?.submitted_at;
  const editable = staff || EDITABLE_FOR_CUSTOMER.includes(vacancy.status);
  const missing = (search.missing ?? "").split(",").filter(Boolean) as BriefingField[];
  const flagged = flaggedItems(briefing);

  const status = search.status;
  const notice =
    status === "saved" ? <Notice kind="ok">{t.saved}</Notice>
    : status === "submitted" ? <Notice kind="ok">{t.submitted}</Notice>
    : status === "locked" ? <Notice kind="info">{t.locked}</Notice>
    : status === "error" ? <Notice kind="error">{t.error}</Notice>
    : status === "applied" ? <Notice kind="ok">{m.suggestions.applied}</Notice>
    : status === "exists" ? <Notice kind="info">{m.suggestions.exists}</Notice>
    : status === "settingsSaved" ? <Notice kind="ok">{m.settings.saved}</Notice>
    : status === "salaryMissing" ? <Notice kind="error">{m.settings.salaryMissing}</Notice>
    : missing.length > 0 ? (
      <Notice kind="error">
        <p>{t.missingIntro}</p>
        <ul className="ml-5 list-disc">
          {missing.filter((k) => k in t.missing).map((k) => <li key={k}>{t.missing[k]}</li>)}
        </ul>
      </Notice>
    ) : null;

  return (
    <main className="flex flex-col gap-6">
      <Link href={base} className="text-sm underline">{m.vacancy.back}</Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-semibold">{vacancy.title}</h1>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-brand-800 text-sm">{m.vacancy.status[vacancy.status]}</span>
        {staff && vacancy.organizations?.name && <span className="text-muted">{vacancy.organizations.name}</span>}
      </div>
      {submittedAt && <p className="text-sm text-muted">{t.submittedAt} {fmt.format(new Date(submittedAt))}</p>}
      {notice}
      {flagged.length > 0 && (
        <Notice kind="info">
          <p>{t.aggWarning}</p>
          <ul className="ml-5 list-disc">{flagged.map((f) => <li key={f}>{f}</li>)}</ul>
        </Notice>
      )}

      {!staff && !EDITABLE_FOR_CUSTOMER.includes(vacancy.status) && <CustomerSections vacancyId={vacancy.id} />}

      <section aria-labelledby="briefing" className="flex flex-col gap-4">
        <h2 id="briefing" className="text-xl font-semibold">{t.title}</h2>
        {editable ? (
          <>
            <p className="text-ink/80">{t.lead}</p>
            <BriefingForm vacancyId={vacancy.id} briefing={briefing} missing={missing} />
          </>
        ) : (
          <Notice kind="info">{t.locked}</Notice>
        )}
      </section>

      {staff && <StaffSections vacancyId={vacancy.id} briefing={briefing} search={search} />}
    </main>
  );
}

async function Suggestions({ vacancyId, briefing }: { vacancyId: string; briefing: ReturnType<typeof fromStored> }) {
  const t = getMessages().suggestions;
  const supabase = await createClient();
  const [{ data: questions }, { data: criteria }] = await Promise.all([
    supabase.from("screening_questions").select("id, question").eq("vacancy_id", vacancyId).order("position"),
    supabase.from("scorecard_criteria").select("id, name, weight").eq("vacancy_id", vacancyId).order("position"),
  ]);
  const hasExisting = (questions?.length ?? 0) > 0 || (criteria?.length ?? 0) > 0;
  const sq = suggestQuestions(briefing);
  const sc = suggestCriteria(briefing);

  return (
    <section aria-labelledby="suggestions" className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="suggestions" className="text-xl font-semibold">{t.title}</h2>
      {hasExisting ? (
        <>
          <h3 className="font-semibold">{t.current}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="font-medium">{t.questions}</h4>
              <ul className="ml-5 list-disc">{questions?.length ? questions.map((q) => <li key={q.id}>{q.question}</li>) : <li>{t.noneYet}</li>}</ul>
            </div>
            <div>
              <h4 className="font-medium">{t.criteria}</h4>
              <ul className="ml-5 list-disc">
                {criteria?.length ? criteria.map((c) => <li key={c.id}>{c.name} ({t.weight} {c.weight})</li>) : <li>{t.noneYet}</li>}
              </ul>
            </div>
          </div>
        </>
      ) : sq.length === 0 && briefing.mustHave.length === 0 ? (
        <p className="text-muted">{t.none}</p>
      ) : (
        <>
          <p className="text-ink/80">{t.lead}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="font-medium">{t.questions}</h3>
              <ul className="ml-5 list-disc">{sq.map((q) => <li key={q.question}>{q.question} <span className="text-sm text-muted">– {t.knockoutNo}</span></li>)}</ul>
            </div>
            <div>
              <h3 className="font-medium">{t.criteria}</h3>
              <ul className="ml-5 list-disc">{sc.map((c) => <li key={c.name}>{c.name} ({t.weight} {c.weight})</li>)}</ul>
            </div>
          </div>
          <form action={applySuggestions}>
            <input type="hidden" name="vacancyId" value={vacancyId} />
            <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">{t.apply}</button>
          </form>
        </>
      )}
    </section>
  );
}

async function StaffSections({ vacancyId, briefing, search }: { vacancyId: string; briefing: ReturnType<typeof fromStored>; search: Props["search"] }) {
  const session = await getSession();
  if (!session) return null;
  return (
    <>
      <VacancySettings vacancyId={vacancyId} />
      <DistributionSection vacancyId={vacancyId} />
      <ApplicationsList vacancyId={vacancyId} viewerId={session.userId} />
      <Suggestions vacancyId={vacancyId} briefing={briefing} />
      <QuestionEditor vacancyId={vacancyId} status={search.q} />
      <CriteriaEditor vacancyId={vacancyId} status={search.c} />
      <AssessmentEditor vacancyId={vacancyId} status={search.t} />
      <AdsSection vacancyId={vacancyId} status={search.a} />
      <CampaignsSection vacancyId={vacancyId} status={search.k} />
    </>
  );
}

async function CustomerSections({ vacancyId }: { vacancyId: string }) {
  const session = await getSession();
  if (!session) return null;
  return <PortalVacancySections vacancyId={vacancyId} viewerId={session.userId} />;
}
