import Link from "next/link";
import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { requireAccess } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { USER_ROLES } from "@/lib/supabase/database.types";
import { MEMBER_ROLES } from "@/lib/team/roles";
import { stateOf } from "@/lib/users/manage";
import { isUuid } from "@/lib/vacancies/paths";
import { addMembership, changeMembership, deleteUser, lockUser, removeMembership, resetAccess, sendLink, signOutUser, updateUser } from "../actions";

export const metadata = { title: "Nutzer verwalten – recrewted" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string }> };
const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
const field = "rounded-lg border border-neutral-300 px-3 py-2";
const OK = ["saved", "reset", "linkSent", "signedOut", "locked", "unlocked"];

/** One user: details, customer memberships, access (login link, sign out, lock), delete. Admins only. */
export default async function UserPage({ params, searchParams }: Props) {
  const session = await requireAccess("/admin/users");
  const [{ id }, { status }] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();
  const t = getMessages().users;
  const tm = getMessages().team;
  const admin = createAdminClient();
  const [{ data: auth }, { data: p }, { data: memberships }, { data: orgs }, { data: log }] = await Promise.all([
    admin.auth.admin.getUserById(id),
    admin.from("profiles").select("id, role, full_name, created_at").eq("id", id).maybeSingle(),
    admin.from("customer_members").select("organization_id, member_role, organizations(name)").eq("profile_id", id),
    admin.from("organizations").select("id, name").order("name"),
    admin.from("audit_log").select("action, occurred_at, actor").or(`record_id.eq.${id},actor.eq.${id}`).order("occurred_at", { ascending: false }).limit(15),
  ]);
  if (!p || !auth.user) notFound();
  const u = auth.user;
  const state = stateOf(u as { banned_until?: string | null; last_sign_in_at?: string | null; invited_at?: string | null });
  const self = id === session.userId;
  const msg = status ? (t.status as Record<string, string>)[status] : null;
  const hidden = <input type="hidden" name="userId" value={id} />;
  const mine = new Set((memberships ?? []).map((m) => m.organization_id));

  return (
    <main className="flex max-w-4xl flex-col gap-8">
      <div>
        <Link href="/admin/users" className="text-sm text-muted underline">← {t.listTitle}</Link>
        <h1 className="mt-2 text-2xl font-semibold">{p.full_name ?? u.email}{self && <span className="text-muted"> ({t.you})</span>}</h1>
        <p className="text-sm text-muted">
          {u.email} · {t.roles[p.role]} · <span className={state === "locked" ? "font-semibold text-red-800" : ""}>{t.states[state]}</span>
          {" · "}{t.lastSignIn}: {u.last_sign_in_at ? fmt.format(new Date(u.last_sign_in_at)) : t.never} · angelegt {fmt.format(new Date(p.created_at))}
        </p>
      </div>
      {msg && <p role={OK.includes(status!) ? "status" : "alert"} className={`rounded-lg p-3 ${OK.includes(status!) ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{msg}</p>}

      <section aria-labelledby="data-h" className="card flex flex-col gap-3">
        <h2 id="data-h" className="text-lg font-semibold">Stammdaten</h2>
        <form action={updateUser} className="grid gap-3 sm:grid-cols-3 sm:items-end">
          {hidden}
          <label className="grid gap-1"><span className="text-sm font-medium">{t.fullName}</span><input name="fullName" defaultValue={p.full_name ?? ""} required minLength={2} maxLength={120} className={field} /></label>
          <label className="grid gap-1"><span className="text-sm font-medium">{t.email}</span><input name="email" type="email" defaultValue={u.email ?? ""} required className={field} /></label>
          <label className="grid gap-1"><span className="text-sm font-medium">{t.role}</span>
            <select name="role" defaultValue={p.role} className={field}>{USER_ROLES.map((r) => <option key={r} value={r}>{t.roles[r]}</option>)}</select>
          </label>
          <p className="text-sm text-muted sm:col-span-2">Eine neue E-Mail-Adresse gilt sofort. Wer von „Kunde“ zu Admin oder Recruiter wechselt, verliert seine Kunden-Zuordnungen.</p>
          <button className="btn-primary justify-self-start py-2">{t.save}</button>
        </form>
      </section>

      {p.role === "customer" && (
        <section aria-labelledby="org-h" className="card flex flex-col gap-3">
          <h2 id="org-h" className="text-lg font-semibold">Unternehmen und Team-Rolle</h2>
          <ul className="flex flex-col divide-y divide-neutral-200">
            {(memberships ?? []).map((m) => (
              <li key={m.organization_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/admin/organizations/${m.organization_id}#team`} className="font-medium underline">{m.organizations?.name}</Link>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={changeMembership} className="flex items-center gap-2">
                    {hidden}<input type="hidden" name="organizationId" value={m.organization_id} />
                    <select name="memberRole" defaultValue={m.member_role} aria-label={tm.role} className="rounded-lg border border-neutral-300 px-2 py-1 text-sm">{MEMBER_ROLES.map((r) => <option key={r} value={r}>{tm.roles[r]}</option>)}</select>
                    <button className="rounded-lg border border-neutral-300 px-3 py-1 text-sm hover:bg-brand-50">{tm.change}</button>
                  </form>
                  <form action={removeMembership}>{hidden}<input type="hidden" name="organizationId" value={m.organization_id} /><button className="rounded-lg border border-neutral-300 px-3 py-1 text-sm text-red-800 hover:bg-red-50">{tm.remove}</button></form>
                </div>
              </li>
            ))}
            {!(memberships ?? []).length && <li className="py-2 text-sm text-muted">Keinem Unternehmen zugeordnet – die Person sieht im Portal nichts.</li>}
          </ul>
          <form action={addMembership} className="flex flex-wrap items-end gap-2">
            {hidden}
            <label className="grid gap-1"><span className="text-sm font-medium">{t.organization}</span>
              <select name="organizationId" className={field}>{(orgs ?? []).filter((o) => !mine.has(o.id)).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
            </label>
            <label className="grid gap-1"><span className="text-sm font-medium">{tm.role}</span>
              <select name="memberRole" defaultValue="member" className={field}>{MEMBER_ROLES.map((r) => <option key={r} value={r}>{tm.roles[r]}</option>)}</select>
            </label>
            <button className="btn-secondary py-2">Zuordnen</button>
          </form>
        </section>
      )}

      <section aria-labelledby="access-h" className="card flex flex-col gap-3">
        <h2 id="access-h" className="text-lg font-semibold">Zugang</h2>
        <p className="text-sm text-muted">recrewted arbeitet ohne Passwort: Anmeldung per Link an die E-Mail-Adresse. „Zurücksetzen“ meldet die Person überall ab und schickt einen neuen Link.</p>
        <div className="flex flex-wrap gap-2">
          <form action={resetAccess}>{hidden}<button className="btn-primary py-2">Zugang zurücksetzen</button></form>
          <form action={sendLink}>{hidden}<button className="btn-secondary py-2">Nur neuen Anmeldelink schicken</button></form>
          <form action={signOutUser}>{hidden}<button className="btn-secondary py-2">Überall abmelden</button></form>
          {!self && (
            <form action={lockUser}>{hidden}{state !== "locked" && <input type="hidden" name="lock" value="on" />}<button className="btn-secondary py-2">{state === "locked" ? "Sperre aufheben" : "Zugang sperren"}</button></form>
          )}
        </div>
      </section>

      {!self && (
        <section aria-labelledby="del-h" className="card flex flex-col gap-3 border-red-200">
          <h2 id="del-h" className="text-lg font-semibold text-red-900">Nutzer löschen</h2>
          <p className="text-sm text-ink/80">Löscht den Zugang endgültig. Vakanzen, Bewertungen, Kommentare und Verträge, die die Person angelegt hat, bleiben erhalten – ohne Verweis auf sie. Im Protokoll bleibt ihre ID stehen. Wer nur vorübergehend nicht mehr arbeiten soll: besser sperren.</p>
          <form action={deleteUser} className="flex flex-wrap items-end gap-2">
            {hidden}
            <label className="grid gap-1"><span className="text-sm font-medium">Zur Bestätigung LÖSCHEN eintippen</span><input name="confirm" autoComplete="off" required className={field} /></label>
            <button className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800">Endgültig löschen</button>
          </form>
        </section>
      )}

      <section aria-labelledby="log-h" className="flex flex-col gap-2">
        <h2 id="log-h" className="text-lg font-semibold">Protokoll (letzte Einträge)</h2>
        <ul className="text-sm text-ink/80">
          {(log ?? []).map((l, i) => <li key={i}>{fmt.format(new Date(l.occurred_at))} · {l.action}{l.actor === id ? " (selbst)" : ""}</li>)}
          {!(log ?? []).length && <li className="text-muted">Keine Einträge.</li>}
        </ul>
      </section>
    </main>
  );
}
