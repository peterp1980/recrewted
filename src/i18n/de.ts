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
    login: "Anmelden",
  },
  login: {
    title: "Anmelden",
    lead: "Geben Sie Ihre E-Mail-Adresse ein. Wir schicken Ihnen einen Link, mit dem Sie sich ohne Passwort anmelden.",
    email: "E-Mail-Adresse",
    submit: "Link schicken",
    sent: "Falls zu dieser Adresse ein Zugang besteht, ist der Link unterwegs. Bitte schauen Sie in Ihr Postfach – der Link gilt eine Stunde.",
    invalidEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    tooMany: "Zu viele Versuche. Bitte warten Sie ein paar Minuten.",
    linkInvalid: "Der Link ist abgelaufen oder wurde schon benutzt. Fordern Sie einfach einen neuen an.",
    inviteOnly: "Zugänge vergibt das recrewted-Team. Sie haben noch keinen? Schreiben Sie uns.",
  },
  nav: {
    admin: "Übersicht",
    users: "Nutzer",
    portal: "Meine Vakanzen",
    logout: "Abmelden",
  },
  admin: {
    title: "Übersicht",
    lead: "Hier kommen als Nächstes Vakanzen, Bewerbungen und Bewertungsbögen hin.",
  },
  portal: {
    title: "Willkommen",
    lead: "Hier sehen Sie bald Ihre Vakanzen, die Shortlist und die Bewertungsbögen.",
    organization: "Ihr Unternehmen",
    noOrganization: "Ihr Zugang ist noch keinem Unternehmen zugeordnet. Bitte melden Sie sich beim recrewted-Team.",
  },
  users: {
    title: "Nutzer",
    inviteTitle: "Nutzer einladen",
    inviteLead: "Die Person bekommt eine E-Mail mit einem Link und meldet sich darüber an.",
    email: "E-Mail-Adresse",
    fullName: "Name",
    role: "Rolle",
    organization: "Unternehmen",
    chooseOrganization: "Bestehendes Unternehmen wählen",
    newOrganization: "oder neues Unternehmen anlegen",
    organizationHint: "Nur für Kunden. Wählen Sie ein Unternehmen oder legen Sie ein neues an.",
    invite: "Einladung schicken",
    listTitle: "Alle Nutzer",
    lastSignIn: "Letzte Anmeldung",
    never: "noch nie",
    invited: "eingeladen",
    changeRole: "Rolle ändern",
    save: "Speichern",
    you: "Sie",
    roles: { admin: "Admin", recruiter: "Recruiter", customer: "Kunde" },
    status: {
      invited: "Einladung verschickt.",
      roleChanged: "Rolle geändert.",
      error: "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.",
      exists: "Zu dieser E-Mail-Adresse gibt es schon einen Zugang.",
      selfDemote: "Sie können Ihre eigene Admin-Rolle nicht entfernen.",
      missingServiceKey: "Der Server-Schlüssel für Supabase fehlt (SUPABASE_SERVICE_ROLE_KEY). Ohne ihn können keine Nutzer eingeladen werden.",
    },
    errors: {
      email: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
      fullName: "Bitte geben Sie einen Namen ein (2–120 Zeichen).",
      role: "Bitte wählen Sie eine Rolle.",
      organization: "Kunden brauchen genau ein Unternehmen: entweder auswählen oder neu anlegen.",
    },
  },
} as const;

export type Messages = typeof de;
