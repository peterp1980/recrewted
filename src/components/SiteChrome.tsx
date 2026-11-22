import Link from "next/link";
import { getMessages } from "@/i18n";
import { ConsentSettingsLink } from "./ConsentAndTracking";
import { Logo } from "./Logo";
import { Arrow } from "./marks";

const NAV = [
  { href: "/leistungen", label: "Leistungen", n: "01" },
  { href: "/pakete", label: "Pakete", n: "02" },
  { href: "/cases", label: "Cases", n: "03" },
  { href: "/jobs", label: "Jobs", n: "04" },
];

/**
 * Header of the public pages: a paper bar with a hairline rule, like the head of a form.
 * No client JavaScript: the mobile menu is a <details> element.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Logo className="h-[22px] w-auto" />
        <nav aria-label="Hauptnavigation" className="hidden items-center md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="group flex items-baseline gap-1.5 border-l border-ink/15 px-4 py-1.5 text-[15px] font-medium hover:text-accent-700">
              <span className="font-mono text-[10px] text-muted group-hover:text-accent-700">{n.n}</span>{n.label}
            </Link>
          ))}
          <Link href="/login" className="border-l border-ink/15 px-4 py-1.5 text-[15px] font-medium hover:text-accent-700">Anmelden</Link>
          <Link href="/kontakt" className="btn-primary ml-3 py-2 text-sm">Kontakt</Link>
        </nav>
        <details className="relative md:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 border-2 border-ink px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest [&::-webkit-details-marker]:hidden">
            Menü
          </summary>
          <nav aria-label="Hauptnavigation" className="hard-shadow absolute right-0 mt-3 flex w-64 flex-col border-2 border-ink bg-paper">
            {[...NAV, { href: "/login", label: "Anmelden", n: "05" }].map((n) => (
              <Link key={n.href} href={n.href} className="flex items-baseline gap-3 border-b border-ink/15 px-4 py-3 font-medium">
                <span className="font-mono text-[10px] text-muted">{n.n}</span>{n.label}
              </Link>
            ))}
            <Link href="/kontakt" className="bg-ink px-4 py-3 font-semibold text-paper">Kontakt aufnehmen</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter({ note }: { note?: string }) {
  return (
    <footer className="grain mt-24 bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-10">
        <div className="flex flex-col justify-between gap-8 border-b border-paper/20 pb-12 md:flex-row md:items-end">
          <p className="max-w-2xl font-display text-4xl leading-[1.05] font-medium sm:text-5xl">
            Sie suchen Menschen. <em className="text-accent-500">Wir bringen die richtigen.</em>
          </p>
          <Link href="/kontakt" className="btn-light shrink-0 self-start md:self-auto">Gespräch vereinbaren <Arrow className="h-4 w-6" /></Link>
        </div>
        <div className="grid gap-10 pt-10 sm:grid-cols-[1.6fr_1fr_1fr]">
          <div className="flex flex-col gap-3 text-sm text-paper/75">
            <span className="font-mono text-[11px] tracking-[0.16em] text-paper/60 uppercase">recrewted</span>
            <p className="max-w-xs">Vorqualifizierte Kandidaten zum Festpreis. Ein Angebot der projx GmbH, Landsberger Str. 72, 80339 München.</p>
          </div>
          <nav aria-label="Angebot" className="flex flex-col gap-2 text-sm">
            <p className="mb-1 font-mono text-[11px] tracking-[0.16em] text-paper/60 uppercase">Angebot</p>
            <Link href="/leistungen" className="text-paper/85 hover:text-accent-500">Leistungen</Link>
            <Link href="/pakete" className="text-paper/85 hover:text-accent-500">Pakete</Link>
            <Link href="/cases" className="text-paper/85 hover:text-accent-500">Cases</Link>
            <Link href="/jobs" className="text-paper/85 hover:text-accent-500">Offene Stellen</Link>
            <Link href="/profil" className="text-paper/85 hover:text-accent-500">{getMessages().profile.footer}</Link>
          </nav>
          <nav aria-label="Rechtliches" className="flex flex-col gap-2 text-sm">
            <p className="mb-1 font-mono text-[11px] tracking-[0.16em] text-paper/60 uppercase">Rechtliches</p>
            <Link href="/kontakt" className="text-paper/85 hover:text-accent-500">Kontakt</Link>
            <Link href="/impressum" className="text-paper/85 hover:text-accent-500">Impressum</Link>
            <Link href="/datenschutz" className="text-paper/85 hover:text-accent-500">Datenschutz</Link>
            <Link href="/barrierefreiheit" className="text-paper/85 hover:text-accent-500">Barrierefreiheit</Link>
            <span className="text-left text-paper/85 [&_button:hover]:text-accent-500"><ConsentSettingsLink /></span>
          </nav>
        </div>
        <div className="mt-12 flex flex-wrap justify-between gap-2 border-t border-paper/20 pt-5 font-mono text-[11px] tracking-wide text-paper/60 uppercase">
          <span>© {new Date().getFullYear()} recrewted · projx GmbH</span>
          {note && <span>{note}</span>}
        </div>
      </div>
    </footer>
  );
}
