import { getMessages } from "@/i18n";
import { EMPLOYMENT_TYPES, REMOTE_OPTIONS, SALARY_PERIODS, type Briefing, type BriefingField } from "@/lib/briefing/schema";
import { saveBriefing } from "@/app/vacancy-actions";

const input = "w-full rounded-md border border-neutral-400 px-3 py-2";
const errorRing = "border-red-600 ring-1 ring-red-600";

type Props = { vacancyId: string; briefing: Briefing; missing: BriefingField[] };

/** The guided briefing form (F13). Plain HTML form: works without JavaScript. */
export function BriefingForm({ vacancyId, briefing: b, missing }: Props) {
  const t = getMessages().briefing;
  const f = t.fields;
  const bad = (field: BriefingField) => missing.includes(field);
  const cls = (field: BriefingField) => `${input} ${bad(field) ? errorRing : ""}`;
  const aria = (field: BriefingField) => (bad(field) ? { "aria-invalid": true as const } : {});

  const Text = ({ name, label, value, field, hint, type = "text", ...rest }: { name: string; label: string; value: string; field?: BriefingField; hint?: string; type?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="grid gap-1">
      <span className="font-medium">{label}</span>
      {hint && <span className="text-sm text-neutral-600">{hint}</span>}
      <input name={name} type={type} defaultValue={value} className={field ? cls(field) : input} {...(field ? aria(field) : {})} {...rest} />
    </label>
  );
  const List = ({ name, label, value, field, hint }: { name: string; label: string; value: string[]; field?: BriefingField; hint?: string }) => (
    <label className="grid gap-1">
      <span className="font-medium">{label}</span>
      <span className="text-sm text-neutral-600">{hint ? `${hint} ` : ""}{f.listHint}</span>
      <textarea name={name} rows={Math.max(3, value.length + 1)} defaultValue={value.join("\n")} className={field ? cls(field) : input} {...(field ? aria(field) : {})} />
    </label>
  );

  return (
    <form action={saveBriefing} className="flex flex-col gap-8">
      <input type="hidden" name="vacancyId" value={vacancyId} />

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-lg font-semibold">{t.sections.role}</legend>
        <Text name="title" label={f.title} hint={f.titleHint} value={b.title} field="title" required maxLength={150} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="font-medium">{f.employmentType}</span>
            <select name="employmentType" defaultValue={b.employmentType ?? ""} className={cls("employmentType")} {...aria("employmentType")}>
              <option value="">{t.options.choose}</option>
              {EMPLOYMENT_TYPES.map((o) => (
                <option key={o} value={o}>{t.options.employmentType[o]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="font-medium">{f.remote}</span>
            <select name="remote" defaultValue={b.remote} className={input}>
              {REMOTE_OPTIONS.map((o) => (
                <option key={o} value={o}>{t.options.remote[o]}</option>
              ))}
            </select>
          </label>
        </div>
        <Text name="location" label={f.location} value={b.location} field="location" maxLength={150} autoComplete="address-level2" />
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-lg font-semibold">{t.sections.tasks}</legend>
        <List name="tasks" label={f.tasks} value={b.tasks} field="tasks" />
        <List name="mustHave" label={f.mustHave} hint={f.mustHaveHint} value={b.mustHave} field="mustHave" />
        <List name="niceToHave" label={f.niceToHave} hint={f.niceToHaveHint} value={b.niceToHave} />
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-lg font-semibold">{t.sections.conditions}</legend>
        <p className="text-sm text-neutral-600">{f.salaryHint}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Text name="salaryMin" label={f.salaryMin} value={b.salaryMin?.toString() ?? ""} field={bad("salaryRange") ? "salaryRange" : "salary"} inputMode="decimal" />
          <Text name="salaryMax" label={f.salaryMax} value={b.salaryMax?.toString() ?? ""} field={bad("salaryRange") ? "salaryRange" : "salary"} inputMode="decimal" />
          <label className="grid gap-1">
            <span className="font-medium">{f.salaryPeriod}</span>
            <select name="salaryPeriod" defaultValue={b.salaryPeriod} className={input}>
              {SALARY_PERIODS.map((o) => (
                <option key={o} value={o}>{t.options.salaryPeriod[o]}</option>
              ))}
            </select>
          </label>
        </div>
        <Text name="startDate" type="date" label={f.startDate} hint={f.startDateHint} value={b.startDate ?? ""} field="startDate" />
        <List name="benefits" label={f.benefits} value={b.benefits} />
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-lg font-semibold">{t.sections.contact}</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Text name="contactName" label={f.contactName} value={b.contactName} field="contactName" autoComplete="name" />
          <Text name="contactEmail" type="email" label={f.contactEmail} value={b.contactEmail} field="contactEmail" autoComplete="email" />
          <Text name="contactPhone" type="tel" label={f.contactPhone} value={b.contactPhone} autoComplete="tel" />
        </div>
        <label className="grid gap-1">
          <span className="font-medium">{f.notes}</span>
          <textarea name="notes" rows={3} defaultValue={b.notes} maxLength={3000} className={input} />
        </label>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <button type="submit" name="intent" value="draft" className="rounded-md border border-neutral-400 px-4 py-2 font-medium hover:bg-neutral-100">
          {t.saveDraft}
        </button>
        <button type="submit" name="intent" value="submit" className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700">
          {t.submit}
        </button>
      </div>
    </form>
  );
}
