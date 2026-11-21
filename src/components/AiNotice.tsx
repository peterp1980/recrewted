import { getMessages } from "@/i18n";
import { Notice } from "./Notice";

/** Result message after an AI action (?ki=…). */
export function AiNotice({ status }: { status: string }) {
  const t = getMessages().ai;
  if (status === "off") return <Notice kind="info">{t.off}</Notice>;
  if (status === "failed") return <Notice kind="error">{t.failed}</Notice>;
  if (status === "refused") return <Notice kind="error">{t.refused}</Notice>;
  const text = t.notices[status];
  if (!text) return null;
  return <Notice kind={status === "adChecks" || status === "noCriteria" || status === "decided" ? "info" : "ok"}>{text}</Notice>;
}
