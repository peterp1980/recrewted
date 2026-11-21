import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Barrierefreiheit – recrewted", alternates: { canonical: `${siteUrl()}/barrierefreiheit` } };

/**
 * Accessibility statement (BFSG / EN 301 549, WCAG 2.1 AA). DRAFT: facts as built; projx reviews the wording
 * and fills in the date of the last check before go-live.
 */
export default function AccessibilityPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-14">
      <p role="note" className="rounded-lg bg-amber-50 p-4 text-amber-900">Entwurf – wird vor dem Livegang geprüft und mit dem Datum der letzten Prüfung versehen.</p>
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Erklärung zur Barrierefreiheit</h1>
      <p>Wir möchten, dass alle Menschen unsere Jobbörse, die Bewerbung und das Kundenportal nutzen können – auch mit Screenreader, Tastatur, Vergrößerung oder am Handy. Maßstab sind die Anforderungen des Barrierefreiheitsstärkungsgesetzes (BFSG) und die WCAG 2.1 auf Stufe AA.</p>
      <h2 className="text-2xl font-bold">Was wir dafür tun</h2>
      <ul className="ml-5 list-disc">
        <li>Bewerbung in zwei Minuten ohne Konto, am Handy, vollständig mit der Tastatur bedienbar.</li>
        <li>Gut sichtbare Fokus-Rahmen, ausreichende Farbkontraste, Texte ohne feste Größen.</li>
        <li>Formularfelder mit Beschriftungen und verständlichen Fehlermeldungen, die vorgelesen werden.</li>
        <li>Bewegungen werden abgeschaltet, wenn Ihr Gerät „Bewegung reduzieren“ eingestellt hat.</li>
        <li>Videos laden erst nach Klick; Bilder haben Alternativtexte.</li>
      </ul>
      <h2 className="text-2xl font-bold">Bekannte Einschränkungen</h2>
      <p>Lebensläufe und Unterlagen, die Unternehmen oder Bewerber hochladen, sind nicht immer barrierefrei. Ältere PDF-Dokumente (z. B. Verträge) prüfen wir schrittweise.</p>
      <h2 className="text-2xl font-bold">Barriere melden</h2>
      <p>Wenn etwas für Sie nicht funktioniert, schreiben Sie uns über das <Link href="/kontakt" className="underline">Kontaktformular</Link>. Wir antworten innerhalb von zwei Wochen und helfen Ihnen auf anderem Weg weiter, etwa mit einer Bewerbung per Telefon.</p>
      <h2 className="text-2xl font-bold">Schlichtung und Marktüberwachung</h2>
      <p>Wenn Sie mit unserer Antwort nicht zufrieden sind, können Sie sich an die zuständige Marktüberwachungsbehörde der Länder für Barrierefreiheit wenden.</p>
    </main>
  );
}
