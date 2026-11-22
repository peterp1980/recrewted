import { emptyBriefing, type Briefing, type EmploymentType } from "@/lib/briefing/schema";

// Turns a job from any source into a draft briefing. Headings in the job text decide where list items go
// (tasks, requirements, nice-to-have, benefits); everything else is kept in the notes for the recruiter.

export type ImportedJob = {
  externalId: string;
  title: string;
  url: string | null;
  location: string;
  postalCode: string;
  remote: "onsite" | "hybrid" | "remote";
  employmentType: EmploymentType | null;
  /** HTML or plain text of the whole job description. */
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: "year" | "month" | "hour";
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", ndash: "–", mdash: "—", bull: "•", hellip: "…" };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n] ?? m);
}

/** HTML to lines: headings become "## ", list items "- ", paragraphs plain lines. */
export function htmlToLines(html: string): string[] {
  const text = decodeEntities(
    decodeEntities(html) // some APIs double-escape
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<h[1-6][^>]*>/gi, "\n## ")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<(strong|b)>\s*([^<]{2,80}?)\s*:?\s*<\/\1>\s*(<br\s*\/?>|<\/p>)/gi, "\n## $2\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<(br|\/p|\/div|\/ul|\/ol|\/li)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
  return text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .map((l) => l.replace(/^[•·▪◦*]\s*/, "- "))
    .filter((l) => l && l !== "-" && l !== "##");
}

type Bucket = "tasks" | "mustHave" | "niceToHave" | "benefits" | null;
const HEADINGS: [RegExp, Bucket][] = [
  [/(wünschenswert|von vorteil|nice to have|schön wäre|plus|optional)/i, "niceToHave"],
  [/(aufgaben|tätigkeit|was (du|sie) (tust|tun|machst|machen)|deine rolle|ihre rolle|responsibilit|what you.?ll do|your role|dein job|das erwartet)/i, "tasks"],
  [/(profil|anforderung|qualifikation|mitbring|bringst du mit|bringen sie mit|requirement|what you bring|about you|voraussetzung|das zeichnet)/i, "mustHave"],
  [/(wir bieten|benefits|vorteile|das bieten|unser angebot|what we offer|deine vorteile|ihre vorteile|warum wir|perks)/i, "benefits"],
];

export function headingBucket(h: string): Bucket {
  for (const [re, b] of HEADINGS) if (re.test(h)) return b;
  return null;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function toBriefing(j: ImportedJob): Briefing {
  const b = emptyBriefing();
  b.title = clip(j.title.trim(), 150);
  b.location = clip(j.location, 120);
  b.postalCode = /^\d{5}$/.test(j.postalCode) ? j.postalCode : "";
  b.remote = j.remote;
  b.employmentType = j.employmentType;
  b.salaryMin = j.salaryMin;
  b.salaryMax = j.salaryMax;
  b.salaryPeriod = j.salaryPeriod;
  let bucket: Bucket = null;
  const notes: string[] = [];
  for (const line of htmlToLines(j.description)) {
    if (line.startsWith("## ")) {
      bucket = headingBucket(line.slice(3));
      if (!bucket) notes.push(line.slice(3));
      continue;
    }
    const item = line.startsWith("- ") ? clip(line.slice(2), 300) : null;
    if (item && bucket && b[bucket].length < 15) b[bucket].push(item);
    else notes.push(line.startsWith("- ") ? `• ${line.slice(2)}` : line);
  }
  b.notes = clip(`Importiert${j.url ? ` aus ${j.url}` : ""}. Bitte prüfen, Ausschlussfragen und Kriterien ergänzen.${notes.length ? `\n\n${notes.join("\n")}` : ""}`, 4000);
  return b;
}

/** "Vollzeit", "full-time", "FULL_TIME", "Werkstudent" … → our employment type. */
export function employmentFrom(s: string | null | undefined): EmploymentType | null {
  const v = (s ?? "").toLowerCase();
  if (!v) return null;
  if (/werkstud|working.?student/.test(v)) return "working_student";
  if (/ausbildung|apprentice|azubi/.test(v)) return "apprenticeship";
  if (/mini.?job|geringfüg|450|520|538|556/.test(v)) return "mini_job";
  if (/freelanc|freiberuf|contract|selbst/.test(v)) return "freelance";
  if (/teilzeit|part.?time/.test(v)) return "part_time";
  if (/vollzeit|full.?time|permanent|unbefristet/.test(v)) return "full_time";
  return null;
}

export function remoteFrom(s: string | null | undefined, flag?: boolean | null): "onsite" | "hybrid" | "remote" {
  const v = (s ?? "").toLowerCase();
  if (/hybrid/.test(v)) return "hybrid";
  if (flag || /remote|homeoffice|home office|telecommut/.test(v)) return "remote";
  return "onsite";
}
