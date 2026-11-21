import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impressum – recrewted", robots: { index: false } };

/** DRAFT: projx must provide the legally required details (address, register, VAT ID, representatives). */
export default function ImprintPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10">
      <p role="note" className="rounded-md bg-amber-50 p-4 text-amber-900">Entwurf – die Pflichtangaben werden vor dem Livegang von projx ergänzt.</p>
      <h1 className="text-2xl font-semibold">Impressum</h1>
      <p>recrewted ist ein Angebot der projx GmbH, München.</p>
      <p>Anschrift, Vertretungsberechtigte, Registergericht und -nummer, Umsatzsteuer-ID und Kontakt folgen.</p>
    </main>
  );
}
