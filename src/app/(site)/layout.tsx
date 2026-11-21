import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getMessages } from "@/i18n";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter note={getMessages().jobs.geoNote} />
    </>
  );
}
