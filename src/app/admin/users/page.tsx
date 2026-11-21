import { getMessages } from "@/i18n";
import { requireAccess } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { USER_ROLES } from "@/lib/supabase/database.types";
import { changeRole, inviteUser } from "./actions";

export const metadata = { title: "Nutzer – recrewted" };

type Props = { searchParams: Promise<{ status?: string; error?: string }> };

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
const input = "rounded-md border border-neutral-400 px-3 py-2";

export default async function UsersPage({ searchParams }: Props) {
  const session = await requireAccess("/admin/users");
  const t = getMessages().users;
  const { status, error } = await searchParams;

  const supabase = await createClient();
  const [{ data: profiles }, { data: orgs }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("id, role, full_name, created_at").order("created_at"),
    supabase.from("organizations").select("id, name").order("name"),
    supabase.from("customer_members").select("profile_id, organization_id"),
  ]);
  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  // E-mail and sign-in dates live in auth.users, readable only with the service role.
  let authUsers = new Map<string, { email?: string; lastSignIn?: string | null; invitedAt?: string | null }>();
  let missingKey = false;
  try {
    const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
    authUsers = new Map(data.users.map((u) => [u.id, { email: u.email, lastSignIn: u.last_sign_in_at ?? null, invitedAt: u.invited_at ?? null }]));
  } catch {
    missingKey = true;
  }

  const statusText = status && status in t.status ? t.status[status as keyof typeof t.status] : null;
  const errorText = error && error in t.errors ? t.errors[error as keyof typeof t.errors] : null;
  const ok = status === "invited" || status === "roleChanged";

  return (
    <main className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold">{t.title}</h1>

      {(statusText || errorText || missingKey) && (
        <p role={ok ? "status" : "alert"} className={`rounded-md p-4 ${ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>
          {errorText ?? statusText ?? t.status.missingServiceKey}
        </p>
      )}

      <section aria-labelledby="invite" className="flex flex-col gap-4">
        <h2 id="invite" className="text-xl font-semibold">
          {t.inviteTitle}
        </h2>
        <p className="text-neutral-700">{t.inviteLead}</p>
        <form action={inviteUser} className="grid max-w-xl gap-3">
          <label className="grid gap-1">
            <span className="font-medium">{t.email}</span>
            <input name="email" type="email" required autoComplete="off" className={input} />
          </label>
          <label className="grid gap-1">
            <span className="font-medium">{t.fullName}</span>
            <input name="fullName" required minLength={2} maxLength={120} className={input} />
          </label>
          <label className="grid gap-1">
            <span className="font-medium">{t.role}</span>
            <select name="role" defaultValue="customer" className={input}>
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t.roles[r]}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="grid gap-2 rounded-md border border-neutral-300 p-3">
            <legend className="px-1 font-medium">{t.organization}</legend>
            <p className="text-sm text-neutral-600">{t.organizationHint}</p>
            <label className="grid gap-1">
              <span>{t.chooseOrganization}</span>
              <select name="organizationId" defaultValue="" className={input}>
                <option value="">–</option>
                {(orgs ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span>{t.newOrganization}</span>
              <input name="newOrganizationName" maxLength={200} className={input} />
            </label>
          </fieldset>
          <button type="submit" disabled={missingKey} className="justify-self-start rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700 disabled:opacity-50">
            {t.invite}
          </button>
        </form>
      </section>

      <section aria-labelledby="list" className="flex flex-col gap-4">
        <h2 id="list" className="text-xl font-semibold">
          {t.listTitle}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-300">
                <th className="py-2 pr-3">{t.fullName}</th>
                <th className="py-2 pr-3">{t.email}</th>
                <th className="py-2 pr-3">{t.organization}</th>
                <th className="py-2 pr-3">{t.lastSignIn}</th>
                <th className="py-2">{t.changeRole}</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((p) => {
                const a = authUsers.get(p.id);
                const orgNames = (members ?? []).filter((m) => m.profile_id === p.id).map((m) => orgName.get(m.organization_id)).filter(Boolean);
                return (
                  <tr key={p.id} className="border-b border-neutral-200 align-top">
                    <td className="py-2 pr-3">
                      {p.full_name ?? "–"}
                      {p.id === session.userId && <span className="ml-1 text-neutral-500">({t.you})</span>}
                    </td>
                    <td className="py-2 pr-3">{a?.email ?? "–"}</td>
                    <td className="py-2 pr-3">{orgNames.join(", ") || "–"}</td>
                    <td className="py-2 pr-3">{a?.lastSignIn ? fmt.format(new Date(a.lastSignIn)) : a?.invitedAt ? t.invited : t.never}</td>
                    <td className="py-2">
                      <form action={changeRole} className="flex gap-2">
                        <input type="hidden" name="userId" value={p.id} />
                        <select name="role" defaultValue={p.role} aria-label={`${t.role}: ${p.full_name ?? a?.email ?? p.id}`} className="rounded-md border border-neutral-400 px-2 py-1">
                          {USER_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {t.roles[r]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="rounded-md border border-neutral-400 px-3 py-1 hover:bg-neutral-100">
                          {t.save}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
