import Link from "next/link";
import { getMessages } from "@/i18n";
import type { Session } from "@/lib/auth/session";
import { Logo } from "./Logo";

/** Header for signed-in areas: navigation by role and logout. */
export function AppHeader({ session }: { session: Session }) {
  const t = getMessages().nav;
  const links =
    session.role === "customer"
      ? [
          { href: "/portal", label: t.portal },
          { href: "/portal/auswertung", label: t.dashboard },
          { href: "/portal/karriereseite", label: t.career },
          { href: "/portal/empfehlungen", label: t.referrals },
          { href: "/portal/team", label: t.team },
          { href: "/portal/integrationen", label: t.integrations },
        ]
      : [
          { href: "/admin", label: t.admin },
          { href: "/admin/kpis", label: t.kpis },
          { href: "/admin/organizations", label: t.organizations },
          { href: "/admin/ad-accounts", label: t.adAccounts },
          { href: "/admin/vertraege", label: t.contracts },
          { href: "/admin/kanaele", label: t.channels },
          { href: "/admin/ki", label: t.ai },
          ...(session.role === "admin" ? [{ href: "/admin/users", label: t.users }] : []),
        ];
  const home = session.role === "customer" ? "/portal" : "/admin";
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <Logo href={home} className="h-6 w-auto" />
          <nav aria-label="Hauptnavigation" className="flex flex-wrap items-center gap-1 text-sm font-medium">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-ink/80 hover:bg-brand-50 hover:text-brand-800">{l.label}</Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="hidden sm:inline">{session.fullName ?? session.email}</span>
          <span className="rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-semibold text-accent-700">
            {session.role === "admin" ? "Admin" : session.role === "recruiter" ? "Recruiter" : "Kunde"}
          </span>
          <form action="/auth/logout" method="post">
            <button type="submit" className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:bg-brand-50">{t.logout}</button>
          </form>
        </div>
      </div>
    </header>
  );
}
