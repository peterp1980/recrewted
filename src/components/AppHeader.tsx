import Link from "next/link";
import { getMessages } from "@/i18n";
import type { Session } from "@/lib/auth/session";

/** Header for signed-in areas: navigation by role and logout. */
export function AppHeader({ session }: { session: Session }) {
  const t = getMessages().nav;
  const links =
    session.role === "customer"
      ? [{ href: "/portal", label: t.portal }]
      : [
          { href: "/admin", label: t.admin },
          ...(session.role === "admin" ? [{ href: "/admin/users", label: t.users }] : []),
        ];
  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <nav aria-label="Hauptnavigation" className="flex items-center gap-4">
          <span className="font-semibold">recrewted</span>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-neutral-700 hover:text-neutral-950 hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm text-neutral-600">
          <span>{session.fullName ?? session.email}</span>
          <form action="/auth/logout" method="post">
            <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1 hover:bg-neutral-100">
              {t.logout}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
