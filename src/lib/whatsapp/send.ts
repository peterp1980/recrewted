// WhatsApp Business Platform (Cloud API), called directly – no reseller in between.
// Env: WHATSAPP_TOKEN (system user token), WHATSAPP_PHONE_NUMBER_ID, optional WHATSAPP_API_VERSION.

export type WaFetch = typeof fetch;

export function whatsappConfig() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return null;
  return { token, phoneId, version: process.env.WHATSAPP_API_VERSION || "v21.0" };
}

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string; retry: boolean };

export async function sendTemplate(
  cfg: { token: string; phoneId: string; version: string },
  to: string,
  tpl: { name: string; params: string[] },
  f: WaFetch = fetch,
): Promise<SendResult> {
  try {
    const res = await f(`https://graph.facebook.com/${cfg.version}/${cfg.phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "template",
        template: { name: tpl.name, language: { code: "de" }, components: [{ type: "body", parameters: tpl.params.map((text) => ({ type: "text", text })) }] },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[]; error?: { message?: string; code?: number } };
    if (res.ok) return { ok: true, id: body.messages?.[0]?.id ?? null };
    return { ok: false, error: `HTTP ${res.status}: ${body.error?.message ?? "unbekannt"}`.slice(0, 500), retry: res.status === 429 || res.status >= 500 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler", retry: true };
  }
}
