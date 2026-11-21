import Link from "next/link";
import { ConsentSettingsLink } from "./ConsentAndTracking";

/** Header and footer of the public pages. Kept tiny for mobile performance. */
export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold">recrewted</Link>
        <nav aria-label="Hauptnavigation" className="flex gap-4 text-sm">
          <Link href="/jobs" className="hover:underline">Jobs</Link>
          <Link href="/login" className="hover:underline">Anmelden</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ note }: { note?: string }) {
  return (
    <footer className="mt-16 border-t border-neutral-200">
      <div className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 py-6 text-sm text-neutral-600">
        <span>© recrewted – projx GmbH</span>
        <Link href="/impressum" className="underline">Impressum</Link>
        <Link href="/datenschutz" className="underline">Datenschutz</Link>
        <ConsentSettingsLink />
        {note && <span>{note}</span>}
      </div>
    </footer>
  );
}
