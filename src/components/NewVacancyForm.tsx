import { getMessages } from "@/i18n";
import { createVacancy } from "@/app/vacancy-actions";

/** Creates a draft vacancy. Shows the organization choice only if there is more than one. */
export function NewVacancyForm({ organizations }: { organizations: { id: string; name: string }[] }) {
  const t = getMessages().vacancy;
  if (organizations.length === 0) return null;
  return (
    <form action={createVacancy} className="grid max-w-xl gap-3">
      <label className="grid gap-1">
        <span className="font-medium">{t.title}</span>
        <input name="title" required minLength={3} maxLength={150} className="rounded-lg border border-neutral-300 px-3 py-2" />
      </label>
      {organizations.length === 1 ? (
        <input type="hidden" name="organizationId" value={organizations[0].id} />
      ) : (
        <label className="grid gap-1">
          <span className="font-medium">{t.organization}</span>
          <select name="organizationId" required className="rounded-lg border border-neutral-300 px-3 py-2">
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </label>
      )}
      <button type="submit" className="justify-self-start rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">
        {t.create}
      </button>
    </form>
  );
}
