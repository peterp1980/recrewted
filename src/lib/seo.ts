import type { Metadata } from "next";
import { siteUrl } from "./site";

// Shared metadata for public pages: canonical, Open Graph and Twitter card in one place,
// so every page shares well on LinkedIn, WhatsApp and Slack.

export const SITE_NAME = "recrewted";
export const OPERATOR = {
  name: "projx GmbH",
  street: "Landsberger Str. 72",
  postalCode: "80339",
  city: "München",
  country: "DE",
  url: "https://projx.de",
} as const;

export function pageMeta({ title, description, path, noindex = false }: { title: string; description?: string; path: string; noindex?: boolean }): Metadata {
  const url = `${siteUrl()}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, locale: "de_DE", type: "website" },
    twitter: { card: "summary_large_image", title, description },
    ...(noindex ? { robots: { index: false } } : {}),
  };
}

/** recrewted as an organisation, run by projx GmbH. Used on the home page and in llms.txt. */
export function organizationJsonLd(): Record<string, unknown> {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: SITE_NAME,
    url: `${base}/`,
    logo: `${base}/brand/recrewted-logo.png`,
    description: "Recruiting zum Festpreis: Anzeigen und Kampagnen, Vorqualifizierung der Bewerber und eine Shortlist mit Bewertungsbogen für das suchende Unternehmen.",
    areaServed: "DE",
    knowsLanguage: "de",
    parentOrganization: {
      "@type": "Organization",
      name: OPERATOR.name,
      url: OPERATOR.url,
      address: { "@type": "PostalAddress", streetAddress: OPERATOR.street, postalCode: OPERATOR.postalCode, addressLocality: OPERATOR.city, addressCountry: OPERATOR.country },
    },
    contactPoint: { "@type": "ContactPoint", contactType: "sales", url: `${base}/kontakt`, availableLanguage: "de" },
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: SITE_NAME,
    url: `${base}/`,
    inLanguage: "de-DE",
    publisher: { "@id": `${base}/#organization` },
    potentialAction: { "@type": "SearchAction", target: `${base}/jobs?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
}

export function faqJsonLd(items: readonly { q: string; a: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${siteUrl()}${it.path}` })),
  };
}
