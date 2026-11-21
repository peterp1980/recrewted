import { findAggIssues, type AggCategory } from "@/lib/agg";
import type { Briefing } from "@/lib/briefing/schema";
import { salaryText } from "@/lib/jobs/format";

// Job ad generator (F8): texts per channel from the briefing, checked before approval.

export type Channel = "portal" | "social";
export const TEMPLATES = {
  portal_classic: { channel: "portal", label: "Portal – klassisch" },
  portal_short: { channel: "portal", label: "Portal – kompakt" },
  social_question: { channel: "social", label: "Social – mit Frage" },
  social_facts: { channel: "social", label: "Social – Fakten" },
} as const;
export type TemplateKey = keyof typeof TEMPLATES;

export type AdContext = { briefing: Briefing; employer: string | null };
export type AdDraft = { title: string; body: string };

const GENDER = /\((m\/w\/d|w\/m\/d|d\/m\/w|m\/w\/x|w\/m\/x|all genders|alle geschlechter)\)/i;
export const withGenderTag = (title: string) => (GENDER.test(title) ? title.trim() : `${title.trim()} (m/w/d)`);

const list = (items: string[]) => items.map((i) => `• ${i}`).join("\n");
const where = (b: Briefing) => (b.remote === "remote" ? "remote" : b.remote === "hybrid" ? `${b.location} (hybrid)` : b.location);
const pay = (b: Briefing) => salaryText(b.salaryMin, b.salaryMax, b.salaryPeriod) ?? "";

export function generateAd(key: TemplateKey, { briefing: b, employer }: AdContext): AdDraft {
  const title = withGenderTag(b.title);
  const who = employer ?? "Unser Kunde";
  switch (key) {
    case "portal_classic":
      return {
        title,
        body: [
          `${who} sucht in ${where(b)} eine:n ${title}.`,
          b.tasks.length ? `Ihre Aufgaben\n${list(b.tasks)}` : "",
          b.mustHave.length ? `Das bringen Sie mit\n${list(b.mustHave)}` : "",
          b.niceToHave.length ? `Von Vorteil\n${list(b.niceToHave)}` : "",
          b.benefits.length ? `Das bieten wir\n${list(b.benefits)}` : "",
          pay(b) ? `Gehalt: ${pay(b)}` : "",
          "Bewerben geht in zwei Minuten – ohne Anschreiben.",
        ].filter(Boolean).join("\n\n"),
      };
    case "portal_short":
      return {
        title,
        body: [
          [`${title} in ${where(b)}`, pay(b)].filter(Boolean).join(" · "),
          b.tasks.length ? `Was Sie tun: ${b.tasks.slice(0, 3).join(", ")}.` : "",
          b.mustHave.length ? `Was Sie mitbringen: ${b.mustHave.slice(0, 3).join(", ")}.` : "",
          b.benefits.length ? `Was Sie bekommen: ${b.benefits.slice(0, 3).join(", ")}.` : "",
          "Bewerbung in zwei Minuten, ohne Anschreiben.",
        ].filter(Boolean).join("\n\n"),
      };
    case "social_question":
      return {
        title,
        body: `${b.mustHave[0] ? `${b.mustHave[0]}? ` : ""}Dann passt das vielleicht: ${title} in ${where(b)}${pay(b) ? `, ${pay(b)}` : ""}. ${b.benefits[0] ? `${b.benefits[0]}. ` : ""}Bewerbung in 2 Minuten, ohne Anschreiben.`,
      };
    case "social_facts":
      return {
        title,
        body: [`${title}`, `📍 ${where(b)}`, ...(pay(b) ? [`💶 ${pay(b)}`] : []), ...b.benefits.slice(0, 2).map((x) => `✓ ${x}`), "Jetzt in 2 Minuten bewerben."].join("\n"),
      };
  }
}

export type AdIssue = { kind: "gender_tag" | "salary" | "location" | "agg" | "too_long" | "empty"; detail?: AggCategory[] };
export const SOCIAL_MAX = 500;

/** Checks before approval: gender tag, salary (if the briefing has one), location, AGG wording, length. */
export function checkAd(ad: AdDraft, channel: Channel, b: Briefing): AdIssue[] {
  const issues: AdIssue[] = [];
  if (!ad.title.trim() || !ad.body.trim()) issues.push({ kind: "empty" });
  if (!GENDER.test(ad.title)) issues.push({ kind: "gender_tag" });
  if (b.salaryMin !== null && b.salaryMax !== null && !/€/.test(ad.body)) issues.push({ kind: "salary" });
  if (b.remote !== "remote" && (!b.location || !ad.body.includes(b.location))) issues.push({ kind: "location" });
  const agg = findAggIssues(`${ad.title}\n${ad.body}`);
  if (agg.length) issues.push({ kind: "agg", detail: agg });
  if (channel === "social" && ad.body.length > SOCIAL_MAX) issues.push({ kind: "too_long" });
  return issues;
}
