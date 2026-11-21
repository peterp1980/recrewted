import { createHmac, timingSafeEqual } from "node:crypto";

// Incoming WhatsApp webhook: delivery states and candidate replies.

export function validSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`);
  const got = Buffer.from(header);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export type WaStatus = { id: string; status: "sent" | "delivered" | "read" | "failed" };
export type WaMessage = { id: string; from: string; text: string | null };

export function parseWebhook(body: unknown): { statuses: WaStatus[]; messages: WaMessage[] } {
  const statuses: WaStatus[] = [];
  const messages: WaMessage[] = [];
  const entries = (body as { entry?: unknown[] })?.entry;
  for (const e of Array.isArray(entries) ? entries : []) {
    const changes = (e as { changes?: unknown[] })?.changes;
    for (const c of Array.isArray(changes) ? changes : []) {
      const v = (c as { value?: { statuses?: unknown[]; messages?: unknown[] } })?.value;
      for (const st of Array.isArray(v?.statuses) ? v.statuses : []) {
        const x = st as { id?: unknown; status?: unknown };
        if (typeof x.id === "string" && (x.status === "sent" || x.status === "delivered" || x.status === "read" || x.status === "failed")) statuses.push({ id: x.id, status: x.status });
      }
      for (const m of Array.isArray(v?.messages) ? v.messages : []) {
        const x = m as { id?: unknown; from?: unknown; text?: { body?: unknown }; button?: { text?: unknown } };
        if (typeof x.id === "string" && typeof x.from === "string" && /^\d{8,15}$/.test(x.from)) {
          const text = typeof x.text?.body === "string" ? x.text.body : typeof x.button?.text === "string" ? x.button.text : null;
          messages.push({ id: x.id, from: `+${x.from}`, text: text?.slice(0, 4000) ?? null });
        }
      }
    }
  }
  return { statuses, messages };
}

export const isOptOut = (text: string | null) => !!text && /^\s*(stop|stopp|abmelden|abbestellen|unsubscribe)\s*[.!]?\s*$/i.test(text);
