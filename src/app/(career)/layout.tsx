import { ConsentAndTracking } from "@/components/ConsentAndTracking";

/** Customer career pages carry the customer's name, not the recrewted navigation. */
export default function CareerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#inhalt" className="sr-only z-50 rounded-lg bg-white px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Zum Inhalt springen</a>
      {children}
      <ConsentAndTracking />
    </>
  );
}
