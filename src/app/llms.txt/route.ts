import { site } from "@/content/site";
import { getMessages } from "@/i18n";
import { jobPath, salaryText } from "@/lib/jobs/format";
import { allPublicJobs } from "@/lib/jobs/public";
import { OPERATOR } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

// llms.txt (https://llmstxt.org): a plain summary for AI search and assistants (GEO).
// Facts only, same wording as the website; active jobs are listed with their public URL.
export const revalidate = 900;

export async function GET() {
  const base = siteUrl();
  const o = getMessages().briefing.options;
  const jobs = await allPublicJobs().catch(() => []);
  const s = site.cases.featured;
  const lines = [
    "# recrewted",
    "",
    `> ${site.home.description} recrewted ist ein Angebot der ${OPERATOR.name}, ${OPERATOR.street}, ${OPERATOR.postalCode} ${OPERATOR.city}.`,
    "",
    "## Für Unternehmen",
    "",
    ...site.home.steps.map((x, i) => `${i + 1}. **${x.title}:** ${x.text}`),
    "",
    ...site.services.items.map((x) => `- **${x.title}:** ${x.text}`),
    "",
    `- **Preis:** ${site.packages.lead} Pakete: ${site.packages.items.map((p) => `${p.name} (${p.text})`).join(", ")}`,
    `- **Ergebnis bei ${s.name}:** ${s.results.map((r) => `${r.value} ${r.label}`).join(", ")}.`,
    "- **Daten:** Hosting in der EU (Frankfurt). Lebensläufe nie öffentlich. KI macht höchstens Vorschläge, entscheiden tun Menschen.",
    "",
    "## Häufige Fragen",
    "",
    ...site.home.faq.flatMap((f) => [`### ${f.q}`, "", f.a, ""]),
    "## Für Bewerberinnen und Bewerber",
    "",
    "Bewerbung in etwa zwei Minuten, am Handy, ohne Anschreiben und ohne Konto. Rückmeldung in jedem Fall.",
    "",
    `## Offene Stellen (${jobs.length})`,
    "",
    ...(jobs.length
      ? jobs.map((j) => {
          const facts = [j.employerName ?? "Unternehmen wird im Gespräch genannt", j.remote ? "Remote" : j.location, j.employmentType ? o.employmentType[j.employmentType] : null, salaryText(j.salaryMin, j.salaryMax, j.salaryPeriod)].filter(Boolean).join(", ");
          return `- [${j.title}](${base}${jobPath(j)}): ${facts}`;
        })
      : ["Zurzeit keine."]),
    "",
    "## Seiten",
    "",
    `- [Leistungen](${base}/leistungen)`,
    `- [Pakete](${base}/pakete)`,
    `- [Cases](${base}/cases)`,
    `- [Jobs](${base}/jobs)`,
    `- [Kontakt](${base}/kontakt)`,
    `- [Impressum](${base}/impressum)`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=900" } });
}
