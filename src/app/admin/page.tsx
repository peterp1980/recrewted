import { getMessages } from "@/i18n";
import { Notice } from "@/components/Notice";
import { NewVacancyForm } from "@/components/NewVacancyForm";
import { VacancyList } from "@/components/VacancyList";
import { createClient } from "@/lib/supabase/server";
import { listVacancies } from "@/lib/vacancies/queries";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AdminHome({ searchParams }: Props) {
  const m = getMessages();
  const { error } = await searchParams;
  const supabase = await createClient();
  const [{ data: orgs }, vacancies, { data: contacts }] = await Promise.all([
    supabase.from("organizations").select("id, name").order("name"),
    listVacancies(),
    supabase.from("contact_requests").select("id, name, company, email, phone, message, created_at").is("handled_at", null).order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <main className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">{m.admin.title}</h1>
      {error === "create" && <Notice kind="error">{m.vacancy.createError}</Notice>}
      <section aria-labelledby="list" className="flex flex-col gap-3">
        <h2 id="list" className="text-xl font-semibold">{m.vacancy.listTitle}</h2>
        <VacancyList items={vacancies} base="/admin" />
      </section>
      {contacts && contacts.length > 0 && (
        <section aria-labelledby="contacts" className="flex flex-col gap-3">
          <h2 id="contacts" className="text-xl font-semibold">Neue Kontaktanfragen ({contacts.length})</h2>
          <ul className="flex flex-col gap-2">
            {contacts.map((c) => (
              <li key={c.id} className="rounded-md border border-neutral-200 p-3">
                <p className="font-medium">{c.name}{c.company ? ` · ${c.company}` : ""} · <a href={`mailto:${c.email}`} className="underline">{c.email}</a>{c.phone ? ` · ${c.phone}` : ""}</p>
                <p className="whitespace-pre-line text-neutral-700">{c.message}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {orgs && orgs.length > 0 && (
        <section aria-labelledby="new" className="flex flex-col gap-3">
          <h2 id="new" className="text-xl font-semibold">{m.vacancy.newTitle}</h2>
          <NewVacancyForm organizations={orgs} />
        </section>
      )}
    </main>
  );
}
