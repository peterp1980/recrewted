import { ConsentAndTracking } from "@/components/ConsentAndTracking";

/** Customer career pages carry the customer's name, not the recrewted navigation. */
export default function CareerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ConsentAndTracking />
    </>
  );
}
