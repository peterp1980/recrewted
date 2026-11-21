// E-mail texts to candidates. Written plainly, like a person would write them.
// Variables are inserted as plain text; mails are sent as text/plain.

export type MailTemplate = "application_received" | "knockout_rejection" | "invite_interview" | "rejection" | "question" | "data_request" | "assessment_invite" | "profile_link" | "job_alert";

export type MailData = {
  firstName: string;
  jobTitle: string;
  employer?: string | null;
  message?: string | null;
  senderName?: string | null;
  link?: string | null;
  /** assessment_invite: time limit in minutes, if any. */
  minutes?: number | null;
  /** job_alert: matching new jobs. */
  jobs?: { title: string; employer: string | null; place: string | null; url: string }[];
  /** The employer's form of address; missing means formal (mails queued before 0012). */
  tone?: "sie" | "du";
};

const sign = (d: MailData) => `Viele Grüße\n${d.senderName ? `${d.senderName}\n` : ""}recrewted`;
const at = (d: MailData) => (d.employer ? ` bei ${d.employer}` : "");

const limitSie = (d: MailData) => (d.minutes ? `Für den Test haben Sie ${d.minutes} Minuten Zeit, sobald Sie ihn starten. Planen Sie sich also eine ruhige Zeit ein.` : "Für den Test gibt es kein Zeitlimit.");
const limitDu = (d: MailData) => (d.minutes ? `Für den Test hast du ${d.minutes} Minuten Zeit, sobald du ihn startest. Plan dir also eine ruhige Zeit ein.` : "Für den Test gibt es kein Zeitlimit.");

const TEMPLATES: Record<MailTemplate, (d: MailData) => { subject: string; text: string }> = {
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
  const safe: MailData = { ...data, firstName: clean(data.firstName), jobTitle: clean(data.jobTitle), employer: clean(data.employer) || null, senderName: clean(data.senderName) || null };
  const render = (data.tone === "du" && TEMPLATES_DU[template]) || TEMPLATES[template];
  const { subject, text } = render(safe);
  return { subject, text: text.replace(/\n{3,}/g, "\n\n") };
}
