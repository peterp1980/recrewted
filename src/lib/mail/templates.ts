// E-mail texts to candidates. Written plainly, like a person would write them.
// Variables are inserted as plain text; mails are sent as text/plain.

import { siteUrl } from "@/lib/site";
import { modeLabel, whenLabel } from "@/lib/booking/format";
import { salaryText } from "@/lib/jobs/format";

export type MailTemplate = "application_received" | "knockout_rejection" | "invite_interview" | "rejection" | "question" | "data_request" | "assessment_invite" | "profile_link" | "job_alert" | "status_update" | "weekly_report" | "pool_invite" | "team_mention" | "team_shortlist" | "vacancy_request"
  | "booking_invite" | "interview_booked" | "interview_cancelled" | "interview_reminder" | "team_booking"
  | "feedback_reminder" | "candidate_survey" | "team_withdrawn" | "feedback_answer";

export type MailData = {
  firstName: string;
  jobTitle: string;
  employer?: string | null;
  message?: string | null;
  senderName?: string | null;
  link?: string | null;
  /** assessment_invite: time limit in minutes, if any. */
  minutes?: number | null;
  /** status_update: the new status (or "pending" for the 7-day reminder). */
  status?: string;
  /** weekly_report: customer name and one line per vacancy. */
  organization?: string;
  lines?: { title: string; text: string }[];
  /** job_alert: matching new jobs. */
  jobs?: { title: string; employer: string | null; place: string | null; url: string }[];
  /** Team mails (0023): comment author, candidate initials, comment excerpt, links. */
  author?: string;
  candidate?: string;
  excerpt?: string;
  applicationId?: string;
  vacancyId?: string;
  /** team_mention: recipient is recrewted staff (link to the admin instead of the portal); the comment is a question. */
  staff?: boolean;
  question?: boolean;
  /** Interviews (0024): start (ISO), duration in `minutes`, mode, place or link, note; team_booking event. */
  startsAt?: string;
  mode?: string;
  location?: string | null;
  note?: string | null;
  rebooked?: boolean;
  /** feedback_reminder: shortlisted candidates still waiting for the customer's feedback. */
  open?: number;
  /** Pay transparency: published range or free text for candidates (0026). */
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryPeriod?: "year" | "month" | "hour";
  salaryNote?: string | null;
  event?: "booked" | "rebooked" | "cancelled";
  /** The employer's form of address; missing means formal (mails queued before 0012). */
  tone?: "sie" | "du";
};

const sign = (d: MailData) => `Viele Grüße\n${d.senderName ? `${d.senderName}\n` : ""}recrewted`;
const at = (d: MailData) => (d.employer ? ` bei ${d.employer}` : "");

const limitSie = (d: MailData) => (d.minutes ? `Für den Test haben Sie ${d.minutes} Minuten Zeit, sobald Sie ihn starten. Planen Sie sich also eine ruhige Zeit ein.` : "Für den Test gibt es kein Zeitlimit.");
const limitDu = (d: MailData) => (d.minutes ? `Für den Test hast du ${d.minutes} Minuten Zeit, sobald du ihn startest. Plan dir also eine ruhige Zeit ein.` : "Für den Test gibt es kein Zeitlimit.");

// Short, human status messages. Unknown statuses fall back to "pending".
const STATUS_SIE: Record<string, (d: MailData) => string> = {
  pending: (d) => `Ihre Bewerbung als ${d.jobTitle}${at(d)} ist nicht vergessen: Wir sind noch dabei, alle Bewerbungen sorgfältig anzuschauen. Sie hören von uns, sobald es Neues gibt.`,
  shortlisted: (d) => `gute Nachrichten: Wir haben Ihre Bewerbung als ${d.jobTitle} dem Unternehmen${d.employer ? ` ${d.employer}` : ""} vorgestellt. Das Unternehmen schaut sie sich jetzt an. Wir melden uns, sobald wir eine Rückmeldung haben.`,
  interview: (d) => `${d.employer ?? "Das Unternehmen"} möchte Sie gern kennenlernen – Ihre Bewerbung als ${d.jobTitle} hat überzeugt. Wir melden uns in Kürze, um einen Termin abzustimmen.`,
  hired: (d) => `herzlichen Glückwunsch zur neuen Stelle als ${d.jobTitle}${at(d)}! Wir freuen uns mit Ihnen und wünschen einen guten Start.`,
  rejected: (d) => `danke für Ihre Bewerbung als ${d.jobTitle}${at(d)} und Ihre Geduld. Diesmal hat es leider nicht gepasst – das Unternehmen hat sich für andere Bewerbungen entschieden. Das sagt nichts über Ihre Qualifikation insgesamt aus. Auf unserer Jobbörse finden Sie weitere Stellen.`,
};
const STATUS_DU: Record<string, (d: MailData) => string> = {
  pending: (d) => `deine Bewerbung als ${d.jobTitle}${at(d)} ist nicht vergessen: Wir sind noch dabei, alle Bewerbungen sorgfältig anzuschauen. Du hörst von uns, sobald es Neues gibt.`,
  shortlisted: (d) => `gute Nachrichten: Wir haben deine Bewerbung als ${d.jobTitle} dem Unternehmen${d.employer ? ` ${d.employer}` : ""} vorgestellt. Das Unternehmen schaut sie sich jetzt an. Wir melden uns, sobald wir eine Rückmeldung haben.`,
  interview: (d) => `${d.employer ?? "Das Unternehmen"} möchte dich gern kennenlernen – deine Bewerbung als ${d.jobTitle} hat überzeugt. Wir melden uns in Kürze, um einen Termin abzustimmen.`,
  hired: (d) => `herzlichen Glückwunsch zur neuen Stelle als ${d.jobTitle}${at(d)}! Wir freuen uns mit dir und wünschen dir einen guten Start.`,
  rejected: (d) => `danke für deine Bewerbung als ${d.jobTitle}${at(d)} und deine Geduld. Diesmal hat es leider nicht gepasst – das Unternehmen hat sich für andere Bewerbungen entschieden. Das sagt nichts über deine Qualifikation insgesamt aus. Auf unserer Jobbörse findest du weitere Stellen.`,
};
const STATUS_SUBJECT: Record<string, string> = { pending: "Kurzer Zwischenstand", shortlisted: "Ihre Bewerbung ist beim Unternehmen", interview: "Einladung zum Kennenlernen", hired: "Herzlichen Glückwunsch!", rejected: "Ihre Bewerbung" };
const STATUS_SUBJECT_DU: Record<string, string> = { ...STATUS_SUBJECT, shortlisted: "Deine Bewerbung ist beim Unternehmen", rejected: "Deine Bewerbung" };
const statusMail = (d: MailData, du: boolean) => {
  const key = d.status && d.status in STATUS_SIE ? d.status : "pending";
  const body = (du ? STATUS_DU : STATUS_SIE)[key](d);
  // "pending" starts mid-sentence in lower case after the greeting like the others.
  return { subject: `${(du ? STATUS_SUBJECT_DU : STATUS_SUBJECT)[key]} – ${d.jobTitle}`, text: `Hallo ${d.firstName},\n\n${body}\n\n${sign(d)}` };
};

// --- Interviews (0024) ---
const where = (d: MailData, du: boolean) =>
  d.mode === "phone" ? (du ? "Wir rufen dich unter deiner Nummer an." : "Wir rufen Sie unter Ihrer Nummer an.")
  : d.mode === "video" ? `Video-Link: ${d.location ?? (du ? "kommt separat" : "folgt separat")}`
  : `Ort: ${d.location ?? (du ? "wir schicken dir die Adresse noch" : "wir schicken Ihnen die Adresse noch")}`;
const slotLine = (d: MailData) => (d.startsAt ? `${whenLabel(d.startsAt)} (${d.minutes ?? 30} Minuten, ${modeLabel(d.mode)})` : "");
const bookingLink = (d: MailData) => d.link ?? "";
const pay = (d: MailData) => {
  const range = d.salaryMin != null && d.salaryMax != null ? salaryText(Number(d.salaryMin), Number(d.salaryMax), d.salaryPeriod ?? "year") : null;
  const text = range ?? d.salaryNote ?? null;
  return text ? `\nGehalt: ${text}` : "";
};

const interviewSie = {
  booking_invite: (d: MailData) => ({
    subject: `Termin zum Kennenlernen: ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\n${d.employer ?? "das Unternehmen"} möchte Sie kennenlernen. Suchen Sie sich einfach einen passenden Termin aus – das dauert eine Minute:\n${bookingLink(d)}${pay(d)}\n\nDer Link gilt 30 Tage. Bis 24 Stunden vorher können Sie dort auch umbuchen oder absagen.\n\n${sign(d)}`,
  }),
  interview_booked: (d: MailData) => ({
    subject: `${d.rebooked ? "Neuer Termin" : "Ihr Termin"}: ${d.jobTitle}${at(d)}`,
    text: `Hallo ${d.firstName},\n\n${d.rebooked ? "Sie haben umgebucht. Ihr neuer Termin" : "danke, Ihr Termin steht"}:\n\n${slotLine(d)}\n${where(d, false)}${d.note ? `\n${d.note}` : ""}${pay(d)}\n\nDen Termin für Ihren Kalender, Umbuchen und Absagen finden Sie hier:\n${bookingLink(d)}\n\nWir freuen uns auf das Gespräch.\n\n${sign(d)}`,
  }),
  interview_cancelled: (d: MailData) => ({
    subject: `Termin abgesagt: ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nleider müssen wir Ihren Termin am ${d.startsAt ? whenLabel(d.startsAt) : ""} absagen. Das tut uns leid.\n\nSie können über Ihren Link einen neuen Termin wählen, sobald neue Termine frei sind:\n${bookingLink(d)}\n\n${sign(d)}`,
  }),
  interview_reminder: (d: MailData) => ({
    subject: `Erinnerung: Ihr Termin morgen – ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nkurz zur Erinnerung an Ihren Termin:\n\n${slotLine(d)}\n${where(d, false)}${d.note ? `\n${d.note}` : ""}\n\nFalls etwas dazwischenkommt, sagen Sie bitte kurz Bescheid:\n${bookingLink(d)}\n\n${sign(d)}`,
  }),
};
const interviewDu = {
  booking_invite: (d: MailData) => ({
    subject: `Termin zum Kennenlernen: ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\n${d.employer ?? "das Unternehmen"} möchte dich kennenlernen. Such dir einfach einen passenden Termin aus – das dauert eine Minute:\n${bookingLink(d)}${pay(d)}\n\nDer Link gilt 30 Tage. Bis 24 Stunden vorher kannst du dort auch umbuchen oder absagen.\n\n${sign(d)}`,
  }),
  interview_booked: (d: MailData) => ({
    subject: `${d.rebooked ? "Neuer Termin" : "Dein Termin"}: ${d.jobTitle}${at(d)}`,
    text: `Hallo ${d.firstName},\n\n${d.rebooked ? "du hast umgebucht. Dein neuer Termin" : "danke, dein Termin steht"}:\n\n${slotLine(d)}\n${where(d, true)}${d.note ? `\n${d.note}` : ""}${pay(d)}\n\nDen Termin für deinen Kalender, Umbuchen und Absagen findest du hier:\n${bookingLink(d)}\n\nWir freuen uns auf das Gespräch.\n\n${sign(d)}`,
  }),
  interview_cancelled: (d: MailData) => ({
    subject: `Termin abgesagt: ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nleider müssen wir deinen Termin am ${d.startsAt ? whenLabel(d.startsAt) : ""} absagen. Das tut uns leid.\n\nÜber deinen Link kannst du einen neuen Termin wählen, sobald neue Termine frei sind:\n${bookingLink(d)}\n\n${sign(d)}`,
  }),
  interview_reminder: (d: MailData) => ({
    subject: `Erinnerung: Dein Termin morgen – ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nkurz zur Erinnerung an deinen Termin:\n\n${slotLine(d)}\n${where(d, true)}${d.note ? `\n${d.note}` : ""}\n\nFalls etwas dazwischenkommt, sag bitte kurz Bescheid:\n${bookingLink(d)}\n\n${sign(d)}`,
  }),
};
const teamBooking = (d: MailData) => {
  const what = d.event === "cancelled" ? "hat den Termin abgesagt" : d.event === "rebooked" ? "hat umgebucht" : "hat einen Termin gebucht";
  const link = `${siteUrl()}${d.staff ? "/admin" : "/portal"}/applications/${d.applicationId ?? ""}`;
  return {
    subject: `${d.candidate ?? "Kandidat"} ${what}: ${d.jobTitle}`,
    text: `Hallo,\n\n${d.candidate ?? "Ein Kandidat"} ${what}.\n\n${slotLine(d)}\n${d.mode === "phone" ? "Telefonat" : d.location ? `Ort/Link: ${d.location}` : ""}\n\nBewertungsbogen und Unterlagen:\n${link}\n\nViele Grüße\nrecrewted`,
  };
};

const TEMPLATES: Record<MailTemplate, (d: MailData) => { subject: string; text: string }> = {
  status_update: (d) => statusMail(d, false),
  ...interviewSie,
  team_booking: teamBooking,
  pool_invite: (d) => ({
    subject: `Eine Stelle, die zu Ihnen passen könnte: ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nSie haben uns erlaubt, uns bei passenden Stellen zu melden – hier ist eine: ${d.jobTitle}${at(d)}.\n\n${d.message ? `${d.message}\n\n` : ""}Alle Infos und die Bewerbung in zwei Minuten:\n${d.link ?? ""}\n\nKein Interesse? Dann müssen Sie nichts tun. In Ihrem Bewerberprofil können Sie die Benachrichtigungen jederzeit abschalten.\n\n${sign(d)}`,
  }),
  team_withdrawn: (d) => ({
    subject: `Bewerbung zurückgezogen: ${d.jobTitle}`,
    text: `Hallo,\n\neine Person auf der Shortlist für ${d.jobTitle} hat ihre Bewerbung zurückgezogen. Ein vereinbarter Termin ist damit abgesagt.\n\n${siteUrl()}${d.staff ? "/admin" : "/portal"}/vacancies/${d.vacancyId ?? ""}\n\nViele Grüße\nrecrewted`,
  }),
  feedback_answer: (d) => ({
    subject: `Rückmeldung zu Ihrer Bewerbung: ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nSie hatten um eine kurze Rückmeldung gebeten, warum es für die Stelle ${d.jobTitle} nicht gepasst hat. Hier ist sie:\n\n${d.message ?? ""}\n\nWir wünschen Ihnen viel Erfolg bei der weiteren Suche.\n\n${sign(d)}`,
  }),
  feedback_reminder: (d) => ({
    subject: `${d.open ?? "Kandidaten"} ${d.open === 1 ? "Kandidat wartet" : "Kandidaten warten"} auf Ihre Rückmeldung: ${d.jobTitle}`,
    text: `Hallo${d.firstName ? ` ${d.firstName}` : ""},\n\nauf der Shortlist für ${d.jobTitle} ${d.open === 1 ? "wartet eine Person" : `warten ${d.open ?? "einige"} Personen`} seit einigen Tagen auf Ihre Rückmeldung. Gute Kandidaten sind oft schnell vergeben – ein Klick genügt: Kennenlernen oder passt nicht, mit einem Satz Begründung.\n\n${siteUrl()}/portal/vacancies/${d.vacancyId ?? ""}/vergleich\n\nViele Grüße\nrecrewted`,
  }),
  candidate_survey: (d) => ({
    subject: "Eine kurze Frage zu Ihrer Bewerbung",
    text: `Hallo ${d.firstName},\n\nIhre Bewerbung als ${d.jobTitle} ist abgeschlossen. Wie haben Sie den Ablauf erlebt? Eine Frage, ein Klick – freiwillig und anonym ausgewertet:\n${d.link ?? ""}\n\nDanke!\n${sign(d)}`,
  }),
  team_mention: (d) => {
    const link = `${siteUrl()}${d.staff ? "/admin" : "/portal"}/applications/${d.applicationId ?? ""}#kommentare`;
    return {
      subject: d.question ? `Rückfrage zu ${d.candidate ?? "einem Kandidaten"} (${d.jobTitle})` : `${d.author ?? "Jemand"} hat Sie erwähnt: ${d.candidate ?? ""} – ${d.jobTitle}`,
      text: `Hallo${d.firstName ? ` ${d.firstName}` : ""},\n\n${d.author ?? "Jemand"} ${d.question ? "hat eine Frage" : "hat Sie in einem Kommentar erwähnt"} – Kandidat ${d.candidate ?? ""}, Stelle ${d.jobTitle}:\n\n„${d.excerpt ?? ""}“\n\nAntworten können Sie direkt am Kandidaten:\n${link}\n\nViele Grüße\nrecrewted`,
    };
  },
  team_shortlist: (d) => ({
    subject: `Neue Kandidaten für Sie: ${d.jobTitle}`,
    text: `Hallo${d.firstName ? ` ${d.firstName}` : ""},\n\nfür die Stelle ${d.jobTitle} haben wir neue vorqualifizierte Kandidaten auf die Shortlist gesetzt. Bewertungsbogen und Unterlagen liegen im Portal:\n${siteUrl()}/portal/vacancies/${d.vacancyId ?? ""}\n\nEin kurzes Feedback (Kennenlernen oder passt nicht, mit einem Satz Begründung) hilft uns, die nächsten Vorschläge noch genauer zu machen.\n\nViele Grüße\nrecrewted`,
  }),
  vacancy_request: (d) => ({
    subject: `Neue Vakanz angefragt: ${d.jobTitle} (${d.organization ?? ""})`,
    text: `Hallo${d.firstName ? ` ${d.firstName}` : ""},\n\n${d.organization ?? "Ein Kunde"} hat das Briefing für „${d.jobTitle}“ abgeschickt. Bitte prüfen, Fragen und Kriterien anlegen und das Angebot vorbereiten:\n${siteUrl()}/admin/vacancies/${d.vacancyId ?? ""}\n\nrecrewted`,
  }),
  weekly_report: (d) => ({
    subject: `Ihr Wochenbericht – ${d.organization ?? ""}`,
    text: `Hallo ${d.firstName},\n\nhier der Stand Ihrer Stellen in der letzten Woche:\n\n${(d.lines ?? []).map((l) => `${l.title}\n${l.text}`).join("\n\n")}\n\nShortlist, Bewertungsbögen und den Bericht als PDF finden Sie im Kundenportal:\n${d.link ?? ""}\n\n${sign(d)}`,
  }),
  application_received: (d) => ({
    subject: `Ihre Bewerbung als ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\ndanke für Ihre Bewerbung als ${d.jobTitle}${at(d)}. Sie ist gut bei uns angekommen.\n\nWir schauen sie uns in den nächsten Tagen an und melden uns bei Ihnen – egal, wie es ausgeht.\n\n${sign(d)}`,
  }),
  knockout_rejection: (d) => ({
    subject: `Ihre Bewerbung als ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nnochmals danke für Ihr Interesse an der Stelle als ${d.jobTitle}${at(d)}.\n\nNach Ihren Angaben passen ein oder mehrere Voraussetzungen, die für diese Stelle fest vorgegeben sind, leider nicht. Deshalb können wir Ihre Bewerbung hier nicht weiterführen. Das sagt nichts über Ihre Qualifikation insgesamt aus.\n\nAuf unserer Jobbörse finden Sie weitere Stellen – vielleicht ist etwas Passendes dabei.\n\nAlles Gute für Ihre Suche!\n\n${sign(d)}`,
  }),
  invite_interview: (d) => ({
    subject: `Einladung zum Gespräch – ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nIhre Bewerbung als ${d.jobTitle}${at(d)} hat uns gefallen. Wir würden Sie gern kennenlernen.\n\n${d.message ?? ""}\n\n${sign(d)}`,
  }),
  rejection: (d) => ({
    subject: `Ihre Bewerbung als ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\ndanke für Ihre Bewerbung als ${d.jobTitle}${at(d)} und Ihre Geduld.\n\nWir haben uns für andere Bewerberinnen und Bewerber entschieden, deren Profil näher an den Anforderungen liegt. Das ist uns nicht leichtgefallen.\n\n${d.message ? `${d.message}\n\n` : ""}Alles Gute für Ihren weiteren Weg!\n\n${sign(d)}`,
  }),
  data_request: (d) => ({
    subject: "Ihre Daten bei recrewted",
    text: `Hallo ${d.firstName},\n\nSie haben gefragt, welche Daten wir über Sie gespeichert haben. Über diesen Link können Sie sie ansehen, herunterladen oder löschen lassen:\n\n${d.link ?? ""}\n\nDer Link gilt 24 Stunden. Wenn Sie das nicht angefordert haben, können Sie diese E-Mail einfach ignorieren.\n\n${sign(d)}`,
  }),
  assessment_invite: (d) => ({
    subject: `Ihr nächster Schritt: kurzer Test – ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nzu Ihrer Bewerbung als ${d.jobTitle}${at(d)} gehört ein kurzer Test. Über diesen Link können Sie ihn machen:\n\n${d.link ?? ""}\n\n${limitSie(d)} Der Link gilt 14 Tage.\n\n${sign(d)}`,
  }),
  profile_link: (d) => ({
    subject: "Ihr Bewerberprofil bei recrewted",
    text: `Hallo ${d.firstName},\n\nüber diesen Link kommen Sie zu Ihrem Bewerberprofil:\n\n${d.link ?? ""}\n\nDort sehen Sie Ihre Bewerbungen, können Ihre Daten ändern, Job-Benachrichtigungen einstellen oder alles löschen. Der Link gilt 30 Tage; einen neuen bekommen Sie jederzeit auf recrewted.de/profil.\n\nWenn Sie das nicht angefordert haben, können Sie diese E-Mail einfach ignorieren.\n\n${sign(d)}`,
  }),
  job_alert: (d) => ({
    subject: (d.jobs?.length ?? 0) === 1 ? "Eine neue Stelle, die zu Ihnen passen könnte" : `${d.jobs?.length ?? 0} neue Stellen, die zu Ihnen passen könnten`,
    text: `Hallo ${d.firstName},\n\nseit unserer letzten Nachricht sind diese Stellen dazugekommen:\n\n${(d.jobs ?? []).map((j) => `${j.title}${j.employer ? ` – ${j.employer}` : ""}${j.place ? `, ${j.place}` : ""}\n${j.url}`).join("\n\n")}\n\nBewerben geht wie immer in zwei Minuten.\n\nWelche Stellen wir Ihnen schicken – oder ob überhaupt –, stellen Sie in Ihrem Profil ein:\n${d.link ?? ""}\n\n${sign(d)}`,
  }),
  question: (d) => ({
    subject: `Rückfrage zu Ihrer Bewerbung als ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nzu Ihrer Bewerbung als ${d.jobTitle}${at(d)} haben wir eine kurze Rückfrage:\n\n${d.message ?? ""}\n\nAntworten Sie einfach auf diese E-Mail.\n\n${sign(d)}`,
  }),
};

// Informal versions for employers that address candidates with "du". Data requests stay formal:
// they come from recrewted, not from an employer.
const TEMPLATES_DU: Partial<Record<MailTemplate, (d: MailData) => { subject: string; text: string }>> = {
  status_update: (d) => statusMail(d, true),
  ...interviewDu,
  feedback_answer: (d) => ({
    subject: `Rückmeldung zu deiner Bewerbung: ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\ndu hattest um eine kurze Rückmeldung gebeten, warum es für die Stelle ${d.jobTitle} nicht gepasst hat. Hier ist sie:\n\n${d.message ?? ""}\n\nWir wünschen dir viel Erfolg bei der weiteren Suche.\n\n${sign(d)}`,
  }),
  candidate_survey: (d) => ({
    subject: "Eine kurze Frage zu deiner Bewerbung",
    text: `Hallo ${d.firstName},\n\ndeine Bewerbung als ${d.jobTitle} ist abgeschlossen. Wie hast du den Ablauf erlebt? Eine Frage, ein Klick – freiwillig und anonym ausgewertet:\n${d.link ?? ""}\n\nDanke!\n${sign(d)}`,
  }),
  pool_invite: (d) => ({
    subject: `Eine Stelle, die zu dir passen könnte: ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\ndu hast uns erlaubt, uns bei passenden Stellen zu melden – hier ist eine: ${d.jobTitle}${at(d)}.\n\n${d.message ? `${d.message}\n\n` : ""}Alle Infos und die Bewerbung in zwei Minuten:\n${d.link ?? ""}\n\nKein Interesse? Dann musst du nichts tun. In deinem Bewerberprofil kannst du die Benachrichtigungen jederzeit abschalten.\n\n${sign(d)}`,
  }),
  application_received: (d) => ({
    subject: `Deine Bewerbung als ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\ndanke für deine Bewerbung als ${d.jobTitle}${at(d)}. Sie ist gut bei uns angekommen.\n\nWir schauen sie uns in den nächsten Tagen an und melden uns bei dir – egal, wie es ausgeht.\n\n${sign(d)}`,
  }),
  knockout_rejection: (d) => ({
    subject: `Deine Bewerbung als ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nnochmals danke für dein Interesse an der Stelle als ${d.jobTitle}${at(d)}.\n\nNach deinen Angaben passen ein oder mehrere Voraussetzungen, die für diese Stelle fest vorgegeben sind, leider nicht. Deshalb können wir deine Bewerbung hier nicht weiterführen. Das sagt nichts über deine Qualifikation insgesamt aus.\n\nAuf unserer Jobbörse findest du weitere Stellen – vielleicht ist etwas Passendes dabei.\n\nAlles Gute für deine Suche!\n\n${sign(d)}`,
  }),
  invite_interview: (d) => ({
    subject: `Einladung zum Gespräch – ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\ndeine Bewerbung als ${d.jobTitle}${at(d)} hat uns gefallen. Wir würden dich gern kennenlernen.\n\n${d.message ?? ""}\n\n${sign(d)}`,
  }),
  rejection: (d) => ({
    subject: `Deine Bewerbung als ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\ndanke für deine Bewerbung als ${d.jobTitle}${at(d)} und deine Geduld.\n\nWir haben uns für andere Bewerberinnen und Bewerber entschieden, deren Profil näher an den Anforderungen liegt. Das ist uns nicht leichtgefallen.\n\n${d.message ? `${d.message}\n\n` : ""}Alles Gute für deinen weiteren Weg!\n\n${sign(d)}`,
  }),
  assessment_invite: (d) => ({
    subject: `Dein nächster Schritt: kurzer Test – ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nzu deiner Bewerbung als ${d.jobTitle}${at(d)} gehört ein kurzer Test. Über diesen Link kannst du ihn machen:\n\n${d.link ?? ""}\n\n${limitDu(d)} Der Link gilt 14 Tage.\n\n${sign(d)}`,
  }),
  question: (d) => ({
    subject: `Rückfrage zu deiner Bewerbung als ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nzu deiner Bewerbung als ${d.jobTitle}${at(d)} haben wir eine kurze Rückfrage:\n\n${d.message ?? ""}\n\nAntworte einfach auf diese E-Mail.\n\n${sign(d)}`,
  }),
};

export function renderMail(template: MailTemplate, data: MailData): { subject: string; text: string } {
  const clean = (s: string | null | undefined) => (s ?? "").replace(/[\r\n]+/g, " ").trim();
  // Line breaks in names or titles must not alter the subject (header injection).
  const safe: MailData = { ...data, firstName: clean(data.firstName), jobTitle: clean(data.jobTitle), employer: clean(data.employer) || null, senderName: clean(data.senderName) || null, author: clean(data.author), candidate: clean(data.candidate), location: data.location ? clean(data.location) : null, organization: clean(data.organization) };
  const render = (data.tone === "du" && TEMPLATES_DU[template]) || TEMPLATES[template];
  const { subject, text } = render(safe);
  return { subject, text: text.replace(/\n{3,}/g, "\n\n") };
}
