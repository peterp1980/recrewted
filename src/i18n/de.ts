// German UI strings. All user-facing text goes through these keys so more
// languages can be added later without touching components.
export const de = {
  meta: {
    title: "recrewted – vorqualifizierte Kandidaten zum Festpreis",
    description:
      "Wir finden Bewerberinnen und Bewerber, prüfen sie vor und schicken Ihnen eine Shortlist mit Bewertungsbogen. Zum Festpreis.",
  },
  home: {
    headline: "Vorqualifizierte Kandidaten zum Festpreis.",
    lead: "Hier entsteht die neue recrewted-Plattform.",
  },
} as const;

export type Messages = typeof de;
