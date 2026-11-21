import Link from "next/link";
import { ConsentSettingsLink } from "./ConsentAndTracking";
import { Logo } from "./Logo";

const NAV = [
  { href: "/leistungen", label: "Leistungen" },
  { href: "/pakete", label: "Pakete" },
  { href: "/cases", label: "Cases" },
  { href: "/jobs", label: "Jobs" },
];

/** Header of the public pages. No client JavaScript: the mobile menu is a <details> element. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Logo />
        <nav aria-label="Hauptnavigation" className="hidden items-center gap-6 text-[15px] font-medium md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-ink/80 hover:text-brand-800">{n.label}</Link>
          ))}
          <Link href="/login" className="text-ink/80 hover:text-brand-800">Anmelden</Link>
          <Link href="/kontakt" className="btn-primary px-4 py-2">Kontakt</Link>
        </nav>
        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium">Menü</summary>
          <nav aria-label="Hauptnavigation" className="absolute right-0 mt-2 flex w-56 flex-col gap-1 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg">
            {[...NAV, { href: "/login", label: "Anmelden" }, { href: "/kontakt", label: "Kontakt" }].map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 hover:bg-brand-50">{n.label}</Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter({ note }: { note?: string }) {
  return (
    <footer className="mt-20 border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Logo className="h-6 w-auto" />
          <p className="max-w-xs text-sm text-muted">Vorqualifizierte Kandidaten zum Festpreis – ein Angebot der projx GmbH, München.</p>
        </div>
        <nav aria-label="Angebot" className="flex flex-col gap-2 text-sm">
          <Link href="/leistungen" className="hover:text-brand-800">Leistungen</Link>
          <Link href="/pakete" className="hover:text-brand-800">Pakete</Link>
          <Link href="/cases" className="hover:text-brand-800">Cases</Link>
          <Link href="/jobs" className="hover:text-brand-800">Offene Stellen</Link>
        </nav>
        <nav aria-label="Rechtliches" className="flex flex-col gap-2 text-sm">
          <Link href="/kontakt" className="hover:text-brand-800">Kontakt</Link>
          <Link href="/impressum" className="hover:text-brand-800">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-brand-800">Datenschutz</Link>
          <span><ConsentSettingsLink /></span>
        </nav>
      </div>
      <div className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-4 text-xs text-muted">
          <span>© {new Date().getFullYear()} recrewted · projx GmbH</span>
          {note && <span>{note}</span>}
        </div>
      </div>
    </footer>
  );
}
