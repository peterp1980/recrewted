import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { getMessages } from "@/i18n";
import { ConsentSettingsLink } from "./ConsentAndTracking";
import { Logo } from "./Logo";

const NAV = [
  { href: "/leistungen", label: "Leistungen" },
  { href: "/pakete", label: "Pakete" },
  { href: "/cases", label: "Cases" },
  { href: "/jobs", label: "Jobs" },
];

/**
 * Header of the public pages: a floating dark glass bar that reads on the dark hero and on light pages alike.
 * No client JavaScript: the mobile menu is a <details> element.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full border border-white/10 bg-night/80 py-2 pr-2 pl-5 shadow-[0_10px_40px_-12px_rgb(7_11_20/0.55)] backdrop-blur-xl">
        <Logo className="h-[22px] w-auto brightness-0 invert" />
        <nav aria-label="Hauptnavigation" className="hidden items-center gap-1 text-[15px] font-medium md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-white/75 transition hover:bg-white/10 hover:text-white">{n.label}</Link>
          ))}
          <Link href="/login" className="rounded-full px-3.5 py-2 text-white/75 transition hover:bg-white/10 hover:text-white">Anmelden</Link>
          <Link href="/kontakt" className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 font-semibold text-night transition hover:bg-brand-300">
            Kontakt <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </nav>
        <details className="relative md:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white [&::-webkit-details-marker]:hidden">
            <Menu className="h-4 w-4" aria-hidden="true" /> Menü
          </summary>
          <nav aria-label="Hauptnavigation" className="absolute right-0 mt-3 flex w-60 flex-col gap-1 rounded-3xl border border-white/10 bg-night-800 p-2 shadow-2xl">
            {[...NAV, { href: "/login", label: "Anmelden" }].map((n) => (
              <Link key={n.href} href={n.href} className="rounded-2xl px-4 py-2.5 text-white/85 hover:bg-white/10">{n.label}</Link>
            ))}
            <Link href="/kontakt" className="mt-1 rounded-2xl bg-brand-500 px-4 py-2.5 font-semibold text-night">Kontakt</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter({ note }: { note?: string }) {
  return (
    <footer className="relative mt-24 overflow-hidden bg-night text-white/70">
      <div aria-hidden="true" className="hero-glow pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-[1.6fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo className="h-6 w-auto brightness-0 invert" />
          <p className="max-w-xs text-sm leading-relaxed">Vorqualifizierte Kandidaten zum Festpreis – ein Angebot der projx GmbH, München.</p>
          <Link href="/kontakt" className="btn-light self-start px-4 py-2 text-sm">Gespräch vereinbaren <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <nav aria-label="Angebot" className="flex flex-col gap-2.5 text-sm">
          <p className="mb-1 text-xs font-semibold tracking-widest text-white/40 uppercase">Angebot</p>
          <Link href="/leistungen" className="hover:text-white">Leistungen</Link>
          <Link href="/pakete" className="hover:text-white">Pakete</Link>
          <Link href="/cases" className="hover:text-white">Cases</Link>
          <Link href="/jobs" className="hover:text-white">Offene Stellen</Link>
          <Link href="/profil" className="hover:text-white">{getMessages().profile.footer}</Link>
        </nav>
        <nav aria-label="Rechtliches" className="flex flex-col gap-2.5 text-sm">
          <p className="mb-1 text-xs font-semibold tracking-widest text-white/40 uppercase">Rechtliches</p>
          <Link href="/kontakt" className="hover:text-white">Kontakt</Link>
          <Link href="/impressum" className="hover:text-white">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-white">Datenschutz</Link>
          <Link href="/barrierefreiheit" className="hover:text-white">Barrierefreiheit</Link>
          <span className="[&_button]:text-white/70 [&_button:hover]:text-white"><ConsentSettingsLink /></span>
        </nav>
      </div>
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-5 text-xs text-white/50">
          <span>© {new Date().getFullYear()} recrewted · projx GmbH</span>
          {note && <span>{note}</span>}
        </div>
      </div>
    </footer>
  );
}
