// Free job channels (F9). Organic listings cost nothing; paid boosts on these portals are not used here.
// "in": candidates come back through our own apply page; every feed link carries its own utm_source,
// so applications are attributed to the channel (F12).

export type ChannelKey = "google" | "indeed" | "jooble" | "talent" | "adzuna" | "careerjet" | "jobrapido" | "kimeta" | "linkedin" | "ba";
export type Channel = {
  key: ChannelKey;
  name: string;
  /** How jobs get there: structured data on our pages, an XML feed we publish, or an upload interface. */
  via: "schema" | "feed" | "interface";
  format?: "indeed" | "linkedin";
  /** What has to happen once before the channel picks the feed up. */
  setup: string;
  signup?: string;
  /** Built and usable today (the BA interface needs a partner registration first). */
  ready: boolean;
};

export const CHANNELS: Channel[] = [
  { key: "google", name: "Google for Jobs", via: "schema", ready: true, setup: "Keine Anmeldung. Google liest die Stellenanzeigen direkt von unseren Seiten (JobPosting-Daten)." },
  { key: "indeed", name: "Indeed", via: "feed", format: "indeed", ready: true, setup: "Feed-URL bei Indeed einreichen (organische Anzeigen, kostenlos). Indeed prüft den Feed; für Personaldienstleister gelten eigene Regeln.", signup: "https://www.indeed.com/hire/xml-feed" },
  { key: "jooble", name: "Jooble", via: "feed", format: "indeed", ready: true, setup: "Feed-URL bei Jooble als Partner-Feed einreichen.", signup: "https://jooble.org/info/partners" },
  { key: "talent", name: "Talent.com", via: "feed", format: "indeed", ready: true, setup: "Feed-URL bei Talent.com für organische Listung einreichen.", signup: "https://employer.talent.com/" },
  { key: "adzuna", name: "Adzuna", via: "feed", format: "indeed", ready: true, setup: "Feed-URL bei Adzuna einreichen (kostenlose Listung).", signup: "https://www.adzuna.de/" },
  { key: "careerjet", name: "Careerjet", via: "feed", format: "indeed", ready: true, setup: "Feed-URL bei Careerjet einreichen.", signup: "https://www.careerjet.de/" },
  { key: "jobrapido", name: "Jobrapido", via: "feed", format: "indeed", ready: true, setup: "Feed-URL bei Jobrapido einreichen.", signup: "https://www.jobrapido.com/" },
  { key: "kimeta", name: "kimeta", via: "feed", format: "indeed", ready: true, setup: "Feed-URL bei kimeta einreichen (Jobsuchmaschine für Deutschland).", signup: "https://www.kimeta.de/" },
  { key: "linkedin", name: "LinkedIn (Basic Jobs)", via: "feed", format: "linkedin", ready: true, setup: "Kostenlose Listung nur nach Freischaltung durch LinkedIn (Job-Feed-Partner). Feed-URL dort einreichen.", signup: "https://www.linkedin.com/help/linkedin/answer/a414979" },
  { key: "ba", name: "Bundesagentur für Arbeit (Jobbörse)", via: "interface", ready: false, setup: "Kostenlos. Braucht eine Anmeldung als Kooperationspartner (HR-BA-XML über SFTP mit Zertifikat). Die Schnittstelle bauen wir, sobald die Zugangsdaten da sind." },
];

export const channel = (key: string) => CHANNELS.find((c) => c.key === key) ?? null;

/** Link from a feed back to our job page, attributed to the channel. */
export function feedLink(jobUrl: string, key: ChannelKey): string {
  const u = new URL(jobUrl);
  u.searchParams.set("utm_source", key);
  u.searchParams.set("utm_medium", "job_feed");
  u.searchParams.set("utm_campaign", `feed-${key}`);
  return u.toString();
}

export type ChannelSettings = { global: Partial<Record<ChannelKey, boolean>>; customerOff: Partial<Record<ChannelKey, string[]>> };

/** A job goes out on a channel if the channel is on for everyone and its customer has not switched it off. */
export function channelOn(s: ChannelSettings, key: ChannelKey, organizationId: string): boolean {
  return Boolean(s.global[key]) && !(s.customerOff[key] ?? []).includes(organizationId);
}
