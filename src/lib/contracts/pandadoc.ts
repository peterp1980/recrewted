import { createHmac, timingSafeEqual } from "node:crypto";

// PandaDoc API (F16). Server only.
//   PANDADOC_API_KEY (secret) – Settings → Integrations → API
//   PANDADOC_WEBHOOK_KEY (secret) – shared key of the webhook (Settings → Integrations → Webhooks)

const API = "https://api.pandadoc.com/public/v1";

export const pandadocConfigured = (env: Record<string, string | undefined> = process.env) => Boolean(env.PANDADOC_API_KEY);
export const documentUrl = (id: string) => `https://app.pandadoc.com/a/#/documents/${id}`;

export class PandaDocError extends Error {
  constructor(message: string, readonly retry: boolean) {
    super(message);
  }
}

export type Recipient = { email: string; first_name: string; last_name: string; role: string; signing_order?: number };
export type DocStatus = "document.uploaded" | "document.draft" | "document.sent" | "document.viewed" | "document.waiting_approval" | "document.completed" | "document.declined" | "document.voided" | string;

export class PandaDoc {
  constructor(private readonly key: string, private readonly f: typeof fetch = fetch) {}

  private async call(method: string, path: string, body?: unknown, raw = false): Promise<unknown> {
    let res: Response;
    try {
      res = await this.f(`${API}${path}`, {
        method,
        headers: { Authorization: `API-Key ${this.key}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });
    } catch (e) {
      throw new PandaDocError(`PandaDoc nicht erreichbar: ${String(e).slice(0, 120)}`, true);
    }
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { detail?: unknown; info_message?: string };
      const detail = res.status === 401 ? "API-Key ungültig" : typeof j.detail === "string" ? j.detail : j.info_message ?? JSON.stringify(j.detail ?? `HTTP ${res.status}`);
      throw new PandaDocError(`PandaDoc: ${detail}`.slice(0, 300), res.status === 429 || res.status >= 500);
    }
    return raw ? new Uint8Array(await res.arrayBuffer()) : res.json().catch(() => ({}));
  }

  async createFromTemplate(d: { name: string; templateId: string; recipients: Recipient[]; tokens: Record<string, string>; metadata: Record<string, string> }): Promise<{ id: string; status: DocStatus }> {
    const r = (await this.call("POST", "/documents", {
      name: d.name,
      template_uuid: d.templateId,
      recipients: d.recipients,
      tokens: Object.entries(d.tokens).map(([name, value]) => ({ name, value })),
      metadata: d.metadata,
      tags: ["recrewted"],
    })) as { id: string; status: DocStatus };
    return { id: r.id, status: r.status };
  }

  async status(id: string): Promise<DocStatus> {
    return ((await this.call("GET", `/documents/${id}`)) as { status: DocStatus }).status;
  }

  send(id: string, subject: string, message: string) {
    return this.call("POST", `/documents/${id}/send`, { subject, message, silent: false });
  }

  download(id: string): Promise<Uint8Array> {
    return this.call("GET", `/documents/${id}/download`, undefined, true) as Promise<Uint8Array>;
  }
}

/** Webhook signature: HMAC-SHA256 of the raw body with the shared key, hex, in the query parameter "signature". */
export function webhookSignatureOk(rawBody: string, signature: string | null, key: string): boolean {
  if (!signature || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", key).update(rawBody).digest("hex");
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/** PandaDoc status → our contract_status. */
export function contractStatus(s: DocStatus): "draft" | "sent" | "viewed" | "completed" | "declined" | "expired" | null {
  switch (s) {
    case "document.uploaded":
    case "document.draft":
      return "draft";
    case "document.sent":
    case "document.waiting_approval":
    case "document.approved":
    case "document.waiting_pay":
      return "sent";
    case "document.viewed":
      return "viewed";
    case "document.completed":
    case "document.paid":
      return "completed";
    case "document.declined":
    case "document.rejected":
      return "declined";
    case "document.voided":
      return "expired";
    default:
      return null;
  }
}

export function splitName(full: string): { first_name: string; last_name: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return { first_name: parts[0] ?? "", last_name: "" };
  return { first_name: parts.slice(0, -1).join(" "), last_name: parts[parts.length - 1] };
}
