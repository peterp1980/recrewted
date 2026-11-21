// E-mail texts to candidates. Written plainly, like a person would write them.
// Variables are inserted as plain text; mails are sent as text/plain.

import { siteUrl } from "@/lib/site";

export type MailTemplate = "application_received" | "knockout_rejection" | "invite_interview" | "rejection" | "question" | "data_request" | "assessment_invite" | "profile_link" | "job_alert" | "status_update" | "weekly_report" | "pool_invite" | "team_mention" | "team_shortlist" | "vacancy_request";

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

const TEMPLATES: Record<MailTemplate, (d: MailData) => { subject: string; text: string }> = {
  status_update: (d) => statusMail(d, false),
  pool_invite: (d) => ({
    subject: `Eine Stelle, die zu Ihnen passen könnte: ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nSie haben uns erlaubt, uns bei passenden Stellen zu melden – hier ist eine: ${d.jobTitle}${at(d)}.\n\n${d.message ? `${d.message}\n\n` : ""}Alle Infos und die Bewerbung in zwei Minuten:\n${d.link ?? ""}\n\nKein Interesse? Dann müssen Sie nichts tun. In Ihrem Bewerberprofil können Sie die Benachrichtigungen jederzeit abschalten.\n\n${sign(d)}`,
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
  const safe: MailData = { ...data, firstName: clean(data.firstName), jobTitle: clean(data.jobTitle), employer: clean(data.employer) || null, senderName: clean(data.senderName) || null, author: clean(data.author), candidate: clean(data.candidate), organization: clean(data.organization) };
  const render = (data.tone === "du" && TEMPLATES_DU[template]) || TEMPLATES[template];
  const { subject, text } = render(safe);
  return { subject, text: text.replace(/\n{3,}/g, "\n\n") };
}
