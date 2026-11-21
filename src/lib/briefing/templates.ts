import { emptyBriefing, type Briefing, type Category, type EmploymentType } from "./schema";

// Starting points for a new briefing, per role. Customers adjust them; nothing is published
// without their briefing and our review. Wording is neutral (AGG): tasks and requirements only.

export type RoleTemplate = {
  id: string;
  label: string;
  category: Category;
  employmentType: EmploymentType;
  title: string;
  tasks: string[];
  mustHave: string[];
  niceToHave: string[];
  benefits: string[];
};

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: "busfahrer", label: "Busfahrer/in (Reise- oder Linienverkehr)", category: "logistics", employmentType: "full_time", title: "Busfahrer (m/w/d)",
    tasks: ["Sicheres Fahren im Reise- oder Linienverkehr", "Betreuung der Fahrgäste unterwegs", "Abfahrtskontrolle und Pflege des Fahrzeugs", "Führen der Fahrtenschreiber-Daten"],
    mustHave: ["Führerschein Klasse D bzw. DE", "Fahrerkarte und Schlüsselzahl 95", "Gute Deutschkenntnisse"],
    niceToHave: ["Erfahrung im Reiseverkehr", "Ortskenntnis in der Region"],
    benefits: ["Moderne Fahrzeugflotte", "Planbare Touren", "Bezahlte Weiterbildungen nach BKrFQG"],
  },
  {
    id: "berufskraftfahrer", label: "Berufskraftfahrer/in (LKW)", category: "logistics", employmentType: "full_time", title: "Berufskraftfahrer (m/w/d) CE",
    tasks: ["Transport von Waren im Nah- oder Fernverkehr", "Be- und Entladen, Ladungssicherung", "Kontrolle von Fahrzeug und Papieren"],
    mustHave: ["Führerschein Klasse CE", "Fahrerkarte und Schlüsselzahl 95"],
    niceToHave: ["ADR-Schein", "Staplerschein"],
    benefits: ["Feste Touren", "Gepflegte Fahrzeuge"],
  },
  {
    id: "lager", label: "Lagermitarbeiter/in", category: "logistics", employmentType: "full_time", title: "Lagermitarbeiter (m/w/d)",
    tasks: ["Warenannahme und -kontrolle", "Kommissionierung und Versand", "Inventur und Ordnung im Lager"],
    mustHave: ["Zuverlässigkeit und Sorgfalt", "Bereitschaft zur Schichtarbeit"],
    niceToHave: ["Staplerschein", "Erfahrung mit Scannern oder Lagersoftware"],
    benefits: ["Unbefristeter Vertrag", "Schichtzulagen"],
  },
  {
    id: "pflege", label: "Pflegefachkraft", category: "healthcare", employmentType: "full_time", title: "Pflegefachkraft (m/w/d)",
    tasks: ["Grund- und Behandlungspflege", "Pflegeplanung und Dokumentation", "Zusammenarbeit mit Ärzten und Angehörigen"],
    mustHave: ["Abgeschlossene Ausbildung als Pflegefachkraft bzw. Gesundheits- und Krankenpfleger/in", "Deutschkenntnisse mindestens B2"],
    niceToHave: ["Weiterbildung Wundmanagement", "Erfahrung in der Praxisanleitung"],
    benefits: ["Verlässliche Dienstpläne", "Bezahlte Fortbildungen"],
  },
  {
    id: "elektriker", label: "Elektroniker/in", category: "craft", employmentType: "full_time", title: "Elektroniker (m/w/d) Energie- und Gebäudetechnik",
    tasks: ["Installation und Wartung elektrischer Anlagen", "Fehlersuche und Reparatur", "Prüfung nach DGUV V3"],
    mustHave: ["Abgeschlossene Ausbildung im Elektrohandwerk", "Führerschein Klasse B"],
    niceToHave: ["Erfahrung mit KNX oder PV-Anlagen"],
    benefits: ["Firmenfahrzeug", "Werkzeug und Arbeitskleidung"],
  },
  {
    id: "buero", label: "Kaufmännische Fachkraft / Büro", category: "office", employmentType: "full_time", title: "Kaufmännischer Mitarbeiter (m/w/d)",
    tasks: ["Auftragsbearbeitung und Kundenkorrespondenz", "Rechnungsprüfung und Ablage", "Unterstützung der Teamleitung"],
    mustHave: ["Kaufmännische Ausbildung", "Sicherer Umgang mit MS Office"],
    niceToHave: ["Erfahrung mit DATEV oder SAP"],
    benefits: ["Gleitzeit", "Möglichkeit zum mobilen Arbeiten"],
  },
  {
    id: "vertrieb", label: "Vertrieb Außendienst", category: "sales", employmentType: "full_time", title: "Vertriebsmitarbeiter (m/w/d) im Außendienst",
    tasks: ["Betreuung und Ausbau des Kundenstamms", "Akquise neuer Kunden", "Angebote erstellen und Verhandlungen führen"],
    mustHave: ["Erfahrung im Vertrieb", "Führerschein Klasse B"],
    niceToHave: ["Branchenkenntnis", "CRM-Erfahrung"],
    benefits: ["Firmenwagen auch zur privaten Nutzung", "Erfolgsabhängige Provision"],
  },
  {
    id: "koch", label: "Koch/Köchin", category: "hospitality", employmentType: "full_time", title: "Koch (m/w/d)",
    tasks: ["Zubereitung der Gerichte nach Karte", "Warenbestellung und -kontrolle", "Einhaltung der HACCP-Vorgaben"],
    mustHave: ["Abgeschlossene Ausbildung als Koch/Köchin oder vergleichbare Erfahrung"],
    niceToHave: ["Erfahrung in der À-la-carte-Küche"],
    benefits: ["Geregelte Arbeitszeiten", "Personalessen"],
  },
  {
    id: "entwickler", label: "Softwareentwickler/in", category: "it", employmentType: "full_time", title: "Softwareentwickler (m/w/d)",
    tasks: ["Entwicklung und Wartung unserer Anwendungen", "Code-Reviews und Tests", "Abstimmung mit Fachbereichen"],
    mustHave: ["Berufserfahrung in der Softwareentwicklung", "Kenntnisse in mindestens einer gängigen Programmiersprache"],
    niceToHave: ["Erfahrung mit Cloud-Plattformen"],
    benefits: ["Mobiles Arbeiten", "Weiterbildungsbudget"],
  },
  {
    id: "erzieher", label: "Erzieher/in", category: "social", employmentType: "full_time", title: "Erzieher (m/w/d)",
    tasks: ["Pädagogische Begleitung der Kinder im Alltag", "Beobachtung und Dokumentation", "Zusammenarbeit mit Eltern"],
    mustHave: ["Staatliche Anerkennung als Erzieher/in oder vergleichbare Qualifikation"],
    niceToHave: ["Erfahrung in der Krippe"],
    benefits: ["Vorbereitungszeit", "Fortbildungen"],
  },
  {
    id: "werkstudent", label: "Werkstudent/in", category: "marketing", employmentType: "working_student", title: "Werkstudent (m/w/d) Marketing",
    tasks: ["Unterstützung bei Kampagnen", "Pflege von Website und Social Media", "Auswertungen und Recherchen"],
    mustHave: ["Immatrikulation an einer Hochschule", "Verfügbarkeit von ca. 15–20 Stunden pro Woche"],
    niceToHave: ["Erste Erfahrung im Online-Marketing"],
    benefits: ["Flexible Arbeitszeiten", "Mobiles Arbeiten möglich"],
  },
];

export const findTemplate = (id: unknown) => (typeof id === "string" ? ROLE_TEMPLATES.find((t) => t.id === id) ?? null : null);

/** Briefing prefilled from a template; the customer's own title wins if given. */
export function briefingFromTemplate(t: RoleTemplate | null, title: string): Briefing {
  const b = emptyBriefing();
  if (!t) return { ...b, title };
  return { ...b, title: title || t.title, category: t.category, employmentType: t.employmentType, tasks: [...t.tasks], mustHave: [...t.mustHave], niceToHave: [...t.niceToHave], benefits: [...t.benefits] };
}
