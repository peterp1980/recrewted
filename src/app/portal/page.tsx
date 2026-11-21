import { getMessages } from "@/i18n";
import { Notice } from "@/components/Notice";
import { NewVacancyForm } from "@/components/NewVacancyForm";
import { VacancyList } from "@/components/VacancyList";
import { createClient } from "@/lib/supabase/server";
import { listVacancies } from "@/lib/vacancies/queries";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function PortalHome({ searchParams }: Props) {
  const m = getMessages();
  const { error } = await searchParams;
  const supabase = await createClient();
  // RLS returns only the customer's own organizations and vacancies.
  const [{ data: orgs }, vacancies] = await Promise.all([supabase.from("organizations").select("id, name").order("name"), listVacancies()]);

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{m.portal.title}</h1>
        {orgs && orgs.length > 0 ? (
          <p className="text-neutral-700">
            {m.portal.organization}: <strong>{orgs.map((o) => o.name).join(", ")}</strong>
          </p>
        ) : (
          <Notice kind="info">{m.portal.noOrganization}</Notice>
        )}
      </div>
      {error === "create" && <Notice kind="error">{m.vacancy.createError}</Notice>}
      <section aria-labelledby="list" className="flex flex-col gap-3">
        <h2 id="list" className="text-xl font-semibold">{m.vacancy.listTitle}</h2>
        <VacancyList items={vacancies} base="/portal" />
      </section>
      {orgs && orgs.length > 0 && (
        <section aria-labelledby="new" className="flex flex-col gap-3">
          <h2 id="new" className="text-xl font-semibold">{m.vacancy.newTitle}</h2>
          <p className="text-neutral-700">{m.vacancy.newLead}</p>
          <NewVacancyForm organizations={orgs} />
        </section>
      )}
    </main>
  );
}
