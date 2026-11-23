import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getMessages } from "@/i18n";
import { ConsentAndTracking } from "@/components/ConsentAndTracking";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#inhalt" className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Zum Inhalt springen</a>
      <SiteHeader />
      <div id="inhalt" tabIndex={-1} className="outline-none">{children}</div>
      <SiteFooter note={getMessages().jobs.geoNote} />
      <ConsentAndTracking />
    </>
  );
}
