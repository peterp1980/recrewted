// Answer templates for "reason after a rejection, on request" (0027).
// Every text names job-related reasons only, or none at all (neutral). No statements about
// age, origin, gender, family, health or other AGG characteristics; the server checks again before sending.
// The mail adds greeting and sign-off, so these are the middle part only.

export type FeedbackTone = "sie" | "du";
export type WeakCriterion = { name: string; reason: string | null };
export type FeedbackTemplate = { id: string; label: string; hint: string; text: string };

const pick = (tone: FeedbackTone, sie: string, du: string) => (tone === "du" ? du : sie);

export function feedbackTemplates(tone: FeedbackTone, weak: WeakCriterion[]): FeedbackTemplate[] {
  const ihre = pick(tone, "Ihre", "deine");
  const Ihre = pick(tone, "Ihre", "Deine");
  const sie = pick(tone, "Sie", "du");
  const list = weak.map((c) => `– ${c.name}${c.reason ? `: ${c.reason}` : ""}`).join("\n");
  const first = weak[0]?.name ?? "[Anforderung aus der Stellenanzeige]";

  const all: (FeedbackTemplate | null)[] = [
    weak.length
      ? {
          id: "criteria",
          label: "Begründet aus dem Bewertungsbogen",
          hint: "Nennt die Kriterien, die mit 1 oder 2 bewertet wurden, mit der Begründung des Recruiters.",
          text: `Wir haben ${ihre} Unterlagen sorgfältig mit den Anforderungen der Stelle verglichen. Ausschlaggebend waren vor allem diese Punkte:\n\n${list}\n\nDas ist eine Einschätzung für genau diese Stelle, kein Urteil über ${ihre} Fähigkeiten insgesamt.`,
        }
      : null,
    {
      id: "neutral",
      label: "Neutral",
      hint: "Ohne Einzelgründe. Passt immer, auch wenn die Entscheidung knapp war.",
      text: `Wir hatten für diese Stelle viele Bewerbungen und haben uns für Personen entschieden, deren Profil noch etwas näher an den Anforderungen lag. Die Entscheidung war nicht einfach und sagt nichts über ${ihre} Eignung für andere Stellen aus.`,
    },
    {
      id: "experience",
      label: "Andere hatten mehr passende Erfahrung",
      hint: "Wenn der Unterschied vor allem in der Berufserfahrung mit den Kernaufgaben lag.",
      text: `Andere Bewerberinnen und Bewerber brachten mehr Erfahrung in den Aufgaben mit, die für diese Stelle im Mittelpunkt stehen. Deshalb haben wir uns für sie entschieden. ${Ihre} Bewerbung hat uns trotzdem gefreut.`,
    },
    {
      id: "requirement",
      label: "Eine Anforderung fehlte",
      hint: "Nennt eine konkrete Anforderung aus der Anzeige. Platzhalter prüfen.",
      text: `Für die Stelle ist ${first} eine feste Voraussetzung. Das konnten wir in ${ihre}n Unterlagen nicht ausreichend erkennen. Falls ${sie} das mitbring${tone === "du" ? "st" : "en"} und es nur nicht aus der Bewerbung hervorging, ${pick(tone, "melden Sie sich gern", "melde dich gern")} noch einmal bei uns.`,
    },
    {
      id: "filled",
      label: "Stelle schon besetzt",
      hint: "Nur verwenden, wenn die Stelle tatsächlich vor der Entscheidung besetzt wurde.",
      text: `Die Stelle wurde inzwischen besetzt, bevor wir ${ihre} Bewerbung im Detail mit den Anforderungen abgleichen konnten. Das tut uns leid – mit ${ihre}r Person hatte die Entscheidung nichts zu tun.`,
    },
    {
      id: "encourage",
      label: "Neutral, mit Einladung für später",
      hint: "Wie neutral, dazu der Hinweis auf passende neue Stellen.",
      text: `Wir haben uns für diese Stelle für eine andere Bewerbung entschieden, die noch etwas genauer zu den Anforderungen gepasst hat. Wir würden uns freuen, wenn ${pick(tone, "Sie sich wieder bewerben", "du dich wieder bewirbst")}, sobald eine passende Stelle frei wird. Neue Stellen ${pick(tone, "finden Sie", "findest du")} unter recrewted.de/jobs – oder ${sie} ${pick(tone, "lassen sich", "lässt dir")} passende Angebote über ${ihre}n Bewerberprofil-Link per E-Mail schicken.`,
    },
  ];
  return all.filter((t): t is FeedbackTemplate => t !== null);
}

/** Default choice: the scorecard reasons when there are any, otherwise neutral. */
export const defaultTemplate = (templates: FeedbackTemplate[]) => templates[0].id;
