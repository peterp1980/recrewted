// E-mail texts to candidates. Written plainly, like a person would write them.
// Variables are inserted as plain text; mails are sent as text/plain.

export type MailTemplate = "application_received" | "knockout_rejection" | "invite_interview" | "rejection" | "question";

export type MailData = { firstName: string; jobTitle: string; employer?: string | null; message?: string | null; senderName?: string | null };

const sign = (d: MailData) => `Viele Grüße\n${d.senderName ? `${d.senderName}\n` : ""}recrewted`;
const at = (d: MailData) => (d.employer ? ` bei ${d.employer}` : "");

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
  question: (d) => ({
    subject: `Rückfrage zu Ihrer Bewerbung als ${d.jobTitle}`,
    text: `Hallo ${d.firstName},\n\nzu Ihrer Bewerbung als ${d.jobTitle}${at(d)} haben wir eine kurze Rückfrage:\n\n${d.message ?? ""}\n\nAntworten Sie einfach auf diese E-Mail.\n\n${sign(d)}`,
  }),
};

export function renderMail(template: MailTemplate, data: MailData): { subject: string; text: string } {
  const clean = (s: string | null | undefined) => (s ?? "").replace(/[\r\n]+/g, " ").trim();
  // Line breaks in names or titles must not alter the subject (header injection).
  const safe: MailData = { ...data, firstName: clean(data.firstName), jobTitle: clean(data.jobTitle), employer: clean(data.employer) || null, senderName: clean(data.senderName) || null };
  const { subject, text } = TEMPLATES[template](safe);
  return { subject, text: text.replace(/\n{3,}/g, "\n\n") };
}
