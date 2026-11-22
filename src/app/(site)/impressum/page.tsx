import type { Metadata } from "next";
import Link from "next/link";
import { Fill } from "@/components/LegalFill";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = { title: "Impressum – recrewted", robots: { index: false } };

/** Imprint (§ 5 DDG, § 18 MStV). Highlighted fields must be filled in by projx before go-live. */
export default function ImprintPage() {
  return (
    <main className="overflow-x-clip">
      <PageHero eyebrow="Rechtliches" title="Impressum" />
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-14 leading-relaxed [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold">
        <p role="note" className="rounded-lg bg-amber-50 p-4 text-amber-900">Entwurf – gelb markierte Angaben ergänzt projx vor dem Livegang.</p>
        <section>
          <h2>Angaben gemäß § 5 DDG</h2>
          <p>projx GmbH<br />Landsberger Str. 72<br />80339 München<br />Deutschland</p>
          <p className="mt-3">recrewted ist ein Angebot der projx GmbH.</p>
        </section>
        <section>
          <h2>Vertreten durch</h2>
          <p>Geschäftsführung: <Fill>Name(n) der Geschäftsführung</Fill></p>
        </section>
        <section>
          <h2>Kontakt</h2>
          <p>Telefon: <Fill>Telefonnummer</Fill><br />E-Mail: <Fill>E-Mail-Adresse</Fill><br />Kontaktformular: <Link href="/kontakt" className="underline">recrewted.de/kontakt</Link></p>
        </section>
        <section>
          <h2>Registereintrag</h2>
          <p>Registergericht: <Fill>Amtsgericht München</Fill><br />Registernummer: <Fill>HRB …</Fill></p>
        </section>
        <section>
          <h2>Umsatzsteuer-ID</h2>
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: <Fill>DE …</Fill></p>
        </section>
        <section>
          <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p><Fill>Name</Fill>, Anschrift wie oben</p>
        </section>
        <section>
          <h2>Verbraucherstreitbeilegung</h2>
          <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
        </section>
        <section>
          <h2>Haftung für Inhalte und Links</h2>
          <p>Wir erstellen die Inhalte dieser Seiten mit Sorgfalt. Stellenanzeigen beruhen auf den Angaben der suchenden Unternehmen. Für Inhalte externer Seiten, auf die wir verlinken, sind deren Betreiber verantwortlich; bei Bekanntwerden von Rechtsverstößen entfernen wir solche Links umgehend.</p>
        </section>
        <section>
          <h2>Bildnachweise</h2>
          <p>Logos und Fotos von Kunden mit deren Freigabe. Geodaten für die Umkreissuche: GeoNames (CC BY 4.0).</p>
        </section>
      </div>
    </main>
  );
}
