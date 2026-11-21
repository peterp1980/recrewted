// Flags wording that is likely discriminatory under the AGG (German General
// Equal Treatment Act): age, gender, origin, religion, disability, family
// status, appearance. A hint for humans, not a legal check.

export type AggCategory = "age" | "gender" | "origin" | "religion" | "disability" | "family" | "appearance";

// Unicode-aware word boundaries: \b does not treat umlauts as letters.
const words = (alternatives: string[]) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join("|")})(?![\\p{L}\\p{N}])`, "iu");

const RULES: { category: AggCategory; pattern: RegExp }[] = [
  {
    category: "age",
    pattern: words([
      "junge[nrs]?", "junges team", "ältere[nrs]?", "älter als", "alter (?:von|zwischen|bis)", "max(?:imal)?\\.? \\d{2} jahre",
      "unter \\d{2} jahren?", "über \\d{2} jahren?", "\\d{2} ?(?:-|bis) ?\\d{2} jahre", "digital natives?", "frisch von der uni",
    ]),
  },
  { category: "gender", pattern: words(["nur (?:männer|frauen)", "männlich", "weiblich", "sekretärin", "kindergärtnerin", "putzfrau"]) },
  {
    category: "origin",
    pattern: words([
      "muttersprachler(?:in)?", "deutsch als muttersprache", "deutsche muttersprache", "herkunft", "nationalität",
      "staatsangehörigkeit", "ethnisch(?:e[nrs]?)?", "hautfarbe", "akzentfrei(?:es)?",
    ]),
  },
  { category: "religion", pattern: words(["religion", "konfession", "christlich(?:e[nrs]?)?", "muslimisch(?:e[nrs]?)?", "kopftuch"]) },
  { category: "disability", pattern: words(["keine behinderung", "körperlich uneingeschränkt", "kerngesund", "voll gesund"]) },
  { category: "family", pattern: words(["familienstand", "ledig", "verheiratet", "kinderlos", "keine kinder", "schwanger(?:schaft)?"]) },
  { category: "appearance", pattern: words(["mit foto", "lichtbild", "attraktiv(?:e[nrs]?)?", "gepflegtes äußeres", "körpergröße", "gewicht"]) },
];

export function findAggIssues(text: string): AggCategory[] {
  const found = new Set<AggCategory>();
  for (const { category, pattern } of RULES) if (pattern.test(text)) found.add(category);
  return [...found];
}
