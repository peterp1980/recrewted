import { getMessages } from "@/i18n";
import { createClient } from "@/lib/supabase/server";
import { MEMBER_ROLES } from "@/lib/team/roles";
import { changeMemberRole, inviteColleague, removeMember } from "@/app/team-actions";
import { Notice } from "./Notice";

const field = "w-full rounded-lg border border-neutral-300 px-3 py-2";

/** Team of one customer. Managers (owners, recrewted staff) invite and change; others read. */
export async function TeamSection({ organizationId, from, status, canManage, viewerId }: { organizationId: string; from: "admin" | "portal"; status?: string; canManage: boolean; viewerId: string }) {
  const t = getMessages().team;
  const supabase = await createClient();
  const { data: team } = await supabase.rpc("org_team", { org: organizationId });
  const hidden = (
    <>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="from" value={from} />
    </>
  );
  const ok = ["invited", "saved", "removed"].includes(status ?? "");
  return (
    <section id="team" aria-labelledby="team-h" className="card flex scroll-mt-20 flex-col gap-4">
      <h2 id="team-h" className="text-lg font-semibold">{t.title}</h2>
      <p className="max-w-3xl text-ink/80">{t.lead}</p>
      {status && t.notices[status] && <Notice kind={ok ? "ok" : "error"}>{t.notices[status]}</Notice>}
      <ul className="flex flex-col divide-y divide-neutral-200">
        {(team ?? []).map((m) => (
          <li key={m.profile_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">{m.full_name || m.email}{m.profile_id === viewerId && <span className="text-muted"> ({t.you})</span>}</p>
              <p className="text-sm text-muted">{m.email} · {t.roles[m.member_role]} – {t.roleHints[m.member_role]}</p>
            </div>
            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                <form action={changeMemberRole} className="flex items-center gap-2">
                  {hidden}
                  <input type="hidden" name="profileId" value={m.profile_id} />
                  <label className="sr-only" htmlFor={`role-${m.profile_id}`}>{t.role}</label>
                  <select id={`role-${m.profile_id}`} name="memberRole" defaultValue={m.member_role} className="rounded-lg border border-neutral-300 px-2 py-1 text-sm">
                    {MEMBER_ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}
                  </select>
                  <button type="submit" className="rounded-lg border border-neutral-300 px-3 py-1 text-sm hover:bg-brand-50">{t.change}</button>
                </form>
                <form action={removeMember}>
                  {hidden}
                  <input type="hidden" name="profileId" value={m.profile_id} />
                  <button type="submit" className="rounded-lg border border-neutral-300 px-3 py-1 text-sm text-red-800 hover:bg-red-50">{t.remove}</button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
      {canManage ? (
        <form action={inviteColleague} className="grid gap-3 border-t border-neutral-200 pt-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          {hidden}
          <h3 className="font-semibold sm:col-span-4">{t.invite}</h3>
          <label className="grid gap-1"><span className="text-sm font-medium">{t.fullName}</span><input name="fullName" required minLength={2} maxLength={120} className={field} /></label>
          <label className="grid gap-1"><span className="text-sm font-medium">{t.email}</span><input name="email" type="email" required className={field} /></label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">{t.role}</span>
            <select name="memberRole" defaultValue="member" className={field}>{MEMBER_ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}</select>
          </label>
          <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 font-semibold text-white hover:bg-brand-800">{t.send}</button>
        </form>
      ) : (
        <p className="text-sm text-muted">{t.readOnly}</p>
      )}
    </section>
  );
}
