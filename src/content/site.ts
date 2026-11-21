// Texts of the B2B website (F21). Plain, concrete, no buzzwords (CLAUDE.md).
// Case texts and package details need input from projx before go-live.

export const site = {
  home: {
    title: "recrewted – vorqualifizierte Kandidaten zum Festpreis",
    description: "Wir finden Bewerberinnen und Bewerber, prüfen sie vor und schicken Ihnen eine Shortlist mit Bewertungsbogen. Zum Festpreis.",
    headline: "Vorqualifizierte Kandidaten zum Festpreis.",
    lead: "Sie sagen uns, wen Sie suchen. Wir schalten die Anzeigen, sprechen mit den Bewerbern und schicken Ihnen nur die, die passen – mit einem Bewertungsbogen, der zeigt, warum.",
    ctaContact: "Gespräch vereinbaren",
    ctaJobs: "Offene Stellen",
    steps: [
      { title: "Briefing", text: "Ein geführtes Formular statt langer Abstimmung: Aufgaben, Muss- und Kann-Kriterien, Gehalt, Start." },
      { title: "Anzeigen und Kampagnen", text: "Wir schreiben die Anzeigen und schalten sie auf Social Media, Google, Jobbörsen und Google for Jobs." },
      { title: "Bewerbung in zwei Minuten", text: "Ohne Anschreiben und ohne Konto, am Handy. Wer die festen Voraussetzungen nicht erfüllt, bekommt eine freundliche Absage." },
      { title: "Shortlist mit Bewertungsbogen", text: "Jeder Kandidat ist nach Ihren Kriterien bewertet und begründet. Sie geben per Klick Rückmeldung." },
    ],
    promise: "Sie sehen jederzeit, wie viele Bewerbungen eingegangen sind, wie viele passen und was ein qualifizierter Kandidat kostet.",
    // Facts that are true by design of the product – no results claimed before the pilot.
    facts: [
      { value: "2 Min.", label: "dauert die Bewerbung – am Handy, ohne Anschreiben" },
      { value: "1 Preis", label: "pro Stelle, Werbebudget inklusive" },
      { value: "100 %", label: "der Kandidaten auf der Shortlist mit begründeter Bewertung" },
    ],
    // TODO(projx): names approved for the website? Same list as on /cases.
    trustLabel: "Kunden und Partner",
    compare: {
      title: "Anders als eine Stellenanzeige",
      lead: "Eine Anzeige bringt Bewerbungen. Wir liefern Kandidaten, die zu Ihren Kriterien passen – und zeigen, warum.",
      before: "Klassische Stellenanzeige",
      after: "recrewted",
      rows: [
        ["Sie zahlen für Reichweite, egal was dabei herauskommt", "Ein fester Preis pro Stelle, Werbebudget inklusive"],
        ["Sie lesen jeden Lebenslauf selbst", "Sie bekommen eine Shortlist mit Bewertungsbogen"],
        ["Bewerber brauchen Anschreiben und viel Zeit", "Bewerbung in zwei Minuten am Handy"],
        ["Unklar, welcher Kanal funktioniert hat", "Gemessen bis zur Einstellung, je Kanal"],
      ],
    },
    portal: {
      title: "Alles an einem Ort",
      lead: "Im Kundenportal sehen Sie Ihre Vakanzen, die Shortlist und jeden Bewertungsbogen. Sie geben per Klick Rückmeldung und melden die Einstellung – ohne E-Mail-Pingpong.",
      points: ["Shortlist mit Bewertungsbögen und Lebensläufen", "Rückmeldung per Klick: passt, Gespräch, Absage", "Kennzahlen je Vakanz, laufend aktuell"],
    },
    faq: [
      { q: "Was kostet das?", a: "Einen festen Preis pro Stelle, abhängig vom Paket. Das Werbebudget ist enthalten. Den genauen Preis nennen wir Ihnen nach dem Briefing, bevor es losgeht." },
      { q: "Was passiert, wenn keine passenden Kandidaten kommen?", a: "Wir sehen früh an den Zahlen, ob eine Kampagne trägt, und steuern nach: andere Kanäle, andere Anzeigen, angepasste Kriterien. Was wir garantieren, legen wir vor dem Start gemeinsam fest." },
      { q: "Wie viel Aufwand habe ich?", a: "Ein Briefing über ein geführtes Formular und danach Rückmeldung zu den Kandidaten auf der Shortlist. Den Rest übernehmen wir." },
      { q: "Wer entscheidet, ob ein Kandidat passt?", a: "Unsere Recruiter bewerten nach Ihren Kriterien und begründen jede Bewertung. Software hilft beim Sortieren, entscheiden tun Menschen – am Ende Sie." },
      { q: "Was passiert mit den Bewerberdaten?", a: "Die Daten speichern wir in Rechenzentren in Frankfurt. Lebensläufe sind nie öffentlich abrufbar, und nach Abschluss der Stelle löschen wir fristgerecht." },
      { q: "Für welche Branchen funktioniert das?", a: "Für alle, in denen Menschen online nach Arbeit suchen – vom Handwerk über Pflege und Logistik bis zum Büro. Für viele Rollen haben wir erprobte Vorlagen." },
    ],
  },
  services: {
    title: "Leistungen",
    lead: "Recruiting-Marketing und Vorauswahl aus einer Hand. Sie bekommen keine Bewerbungsflut, sondern eine Shortlist.",
    items: [
      { title: "Suchprofil", text: "Aus Ihrem Briefing entsteht ein klares Suchprofil mit Ausschlussfragen und gewichteten Kriterien für den Bewertungsbogen." },
      { title: "Anzeigen", text: "Texte für Jobportale und Social Media aus erprobten Vorlagen – geprüft auf diskriminierungsfreie Formulierungen und mit Gehaltsangabe." },
      { title: "Kampagnen", text: "Wir schalten über unsere Werbekonten auf Meta, Google, TikTok und LinkedIn, dazu Jobbörsen und Google for Jobs. Budget und Ziel legen wir vorher fest." },
      { title: "Vorqualifizierung", text: "Ausschlussfragen sortieren automatisch aus, was nicht passen kann. Unsere Recruiter bewerten den Rest nach Ihren Kriterien und begründen jede Bewertung." },
      { title: "Kundenportal", text: "Shortlist, Bewertungsbögen, Lebensläufe und Verträge an einem Ort. Rückmeldung per Klick, Einstellung melden mit einem Klick." },
      { title: "Messung bis zur Einstellung", text: "Wir messen nicht nur Klicks, sondern bis zur Einstellung: Zeit bis zur Shortlist, Kosten pro qualifiziertem Kandidaten, Besetzungsquote." },
    ],
  },
  packages: {
    title: "Pakete",
    lead: "Jede Vakanz hat einen festen Preis, Media inklusive. Was genau dazugehört, besprechen wir anhand Ihrer Stelle.",
    note: "Preise und Garantie stimmen wir mit Ihnen vor dem Start ab.",
    // TODO(projx): replace with "ab … €" once prices are approved.
    price: "Festpreis nach Briefing",
    items: [
      { name: "Starter", text: "Für eine Stelle mit klarem Profil in einer Region.", points: ["Briefing und Suchprofil", "Anzeigen für Jobbörse und Social Media", "Shortlist mit Bewertungsbogen"] },
      { name: "Pro", text: "Für Profile, die schwerer zu finden sind.", points: ["Alles aus Starter", "Mehr Kanäle und längere Laufzeit", "Laufende Optimierung nach Kosten pro qualifiziertem Kandidaten"] },
      { name: "Enterprise", text: "Für mehrere Stellen oder Standorte.", points: ["Alles aus Pro", "Gemeinsame Planung mehrerer Vakanzen", "Fester Ansprechpartner"] },
    ],
  },
  cases: {
    title: "Cases",
    lead: "Was wir für Kunden erreicht haben – und was sie selbst darüber sagen.",
    // Main case, taken from the old site (recrewted.de/erfolgsgeschichte-stepin). Figures as published there.
    featured: {
      name: "Stepin GmbH",
      logo: "/cases/stepin-logo.png",
      mark: "/cases/stepin-mark.png",
      eyebrow: "Erfolgsgeschichte",
      headline: "11 Stellen in zwei Monaten besetzt",
      about: "Stepin steht für „Student Travel & Education Programmes International“ und wurde 1997 in Bonn gegründet. Das Unternehmen vermittelt Schüleraustausch, Au-pair- und Work-&-Travel-Programme.",
      goal: "Stepin wuchs schnell und musste mehrere Stellen im Team dringend besetzen.",
      challengeText: "Anzeigen schreiben, Bewerbungen sichten, Gespräche führen: Recruiting kostete viel Zeit, die für das Wachstum gebraucht wurde. Dazu kamen:",
      challenges: ["Hohe Kosten", "Unpassende Bewerbungen", "Zu wenige Stellen besetzt", "Zu wenig Reichweite"],
      solution: "Mit recrewted bekam Stepin innerhalb einer Woche eine eigene Karriereseite mit allen offenen Stellen, dazu neue Stellenanzeigen.",
      results: [
        { value: "11", label: "neue Mitarbeitende", text: "Alle offenen Stellen besetzt, mit deutlich passenderen Profilen." },
        { value: "2 Monate", label: "bis alles besetzt war", text: "Alle 11 Stellen innerhalb von zwei Monaten besetzt." },
        { value: "86 %", label: "geringere Kosten", text: "Im Vergleich zu den sonst üblichen Jobportalen." },
        { value: "1 Woche", label: "bis zur Karriereseite", text: "Eigene Karriereseite mit allen Stellen, nach Stepins Wünschen." },
      ],
      quote: "recrewted hat meine Erwartungen in jeder Hinsicht übertroffen! Die Anwendung ist so unkompliziert, dass ich Zeit und Nerven gespart habe. Die Qualität der Bewerber, die wir durch recrewted gefunden haben, war beeindruckend hoch. Und der finanzielle Aspekt? Absolut unschlagbar im Vergleich zu anderen Recruiting-Portalen! Wer eine effiziente, qualitätsorientierte und kostengünstige Lösung fürs Recruiting sucht, ist mit recrewted an der richtigen Adresse!",
      quoteBy: "Julia M. Proksch",
      quoteRole: "Operational Excellence, Stepin",
      quotePhoto: "/cases/stepin-testimonial.jpg",
    },
    // TODO(projx): short approved descriptions for Randstad and Hafermann (what we did, no figures yet).
    items: [
      { name: "GULP", logo: "/cases/gulp.png", text: "Personaldienstleister für IT, Engineering und Life Science – im harten Wettbewerb mit bundesweiten Anbietern und internationalen Freelancer-Portalen." },
      { name: "Randstad", logo: "/cases/randstad.png", text: "Internationaler Personaldienstleister." },
      { name: "Hafermann Reisen", logo: "/cases/hafermann.png", text: "Reiseunternehmen." },
    ],
  },
  contact: {
    title: "Kontakt",
    lead: "Erzählen Sie uns kurz, wen Sie suchen. Wir melden uns innerhalb eines Werktags.",
    name: "Name",
    company: "Unternehmen",
    email: "E-Mail",
    phone: "Telefon (optional)",
    message: "Worum geht es?",
    consent: "Ich bin einverstanden, dass recrewted meine Angaben speichert, um meine Anfrage zu beantworten.",
    submit: "Anfrage senden",
    sent: "Danke! Wir melden uns innerhalb eines Werktags.",
    invalid: "Bitte Name, eine gültige E-Mail-Adresse und Ihre Nachricht angeben und dem Speichern zustimmen.",
  },
} as const;
