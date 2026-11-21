import { modeLabel, whenLabel } from "@/lib/booking/format";
import { STATUS_SHORT } from "./status-text";

// Our message types → WhatsApp templates. Business-initiated WhatsApp messages must use templates
// approved by Meta; the texts to submit are in docs/whatsapp.md. Parameters are plain text.

export type WaTemplate = { name: string; params: string[] };
type Data = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v)).replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, 200) || "-";

const place = (d: Data) => (d.mode === "phone" ? "Telefon" : `${modeLabel(d.mode)}${d.location ? `, ${s(d.location)}` : ""}`);
const when = (d: Data) => (typeof d.startsAt === "string" ? whenLabel(d.startsAt) : "-");

const BUILDERS: Record<string, (d: Data) => string[] | null> = {
  status_update: (d) => (typeof d.status === "string" && STATUS_SHORT[d.status] ? [s(d.firstName), s(d.jobTitle), STATUS_SHORT[d.status]] : null),
  assessment_invite: (d) => (d.link ? [s(d.firstName), s(d.jobTitle), s(d.link)] : null),
  booking_invite: (d) => (d.link ? [s(d.firstName), s(d.jobTitle), s(d.link)] : null),
  interview_booked: (d) => [s(d.firstName), s(d.jobTitle), when(d), place(d)],
  interview_cancelled: (d) => [s(d.firstName), s(d.jobTitle), when(d)],
  interview_reminder: (d) => [s(d.firstName), when(d), place(d)],
};

/** Template name and body parameters, or null if this message has no WhatsApp form. Du-employers use the _du variant. */
export function waTemplate(template: string, data: Data): WaTemplate | null {
  const build = BUILDERS[template];
  const params = build?.(data);
  if (!params) return null;
  return { name: `recrewted_${template}${data.tone === "du" ? "_du" : ""}`, params };
}

export const WA_TEMPLATES = Object.keys(BUILDERS);
