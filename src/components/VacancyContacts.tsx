import { getMessages } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { setVacancyContacts } from "@/app/team-actions";
import { Notice } from "./Notice";

/** Who at the customer is responsible for a vacancy. */
export async function VacancyContacts({ vacancyId, organizationId, canEdit, status }: { vacancyId: string; organizationId: string; canEdit: boolean; status?: string }) {
  const t = getMessages().team;
  const supabase = await createClient();
  const [{ data: team }, { data: contacts }] = await Promise.all([
    supabase.rpc("org_team", { org: organizationId }),
    supabase.from("vacancy_contacts").select("profile_id").eq("vacancy_id", vacancyId),
  ]);
  if (!team?.length) return null;
  const chosen = new Set((contacts ?? []).map((c) => c.profile_id));
  return (
    <section id="zustaendig" aria-labelledby="contacts-h" className="flex scroll-mt-20 flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="contacts-h" className="text-xl font-semibold">{t.contacts}</h2>
      <p className="text-sm text-ink/80">{t.contactsLead}</p>
      {status === "saved" && <Notice kind="ok">{t.contactsSaved}</Notice>}
      {status === "error" && <Notice kind="error">{t.notices.error}</Notice>}
      <form action={setVacancyContacts} className="flex flex-col gap-2">
        <input type="hidden" name="vacancyId" value={vacancyId} />
        {team.map((m) => (
          <label key={m.profile_id} className="flex items-center gap-2">
            <input type="checkbox" name="contact" value={m.profile_id} defaultChecked={chosen.has(m.profile_id)} disabled={!canEdit} />
            {m.full_name || m.email} <span className="text-sm text-muted">({t.roles[m.member_role]})</span>
          </label>
        ))}
        {canEdit && <button type="submit" className="self-start rounded-lg border border-neutral-300 px-4 py-1.5 hover:bg-brand-50">{t.contactsSave}</button>}
      </form>
    </section>
  );
}
