// Pipedrive API v1 (F15). Server only; the token never reaches the browser.
//   PIPEDRIVE_API_TOKEN (secret), PIPEDRIVE_PIPELINE_ID and PIPEDRIVE_STAGE_ID (new deals),
//   optional PIPEDRIVE_COMPANY_DOMAIN (e.g. "projx") for links to deals.

const API = "https://api.pipedrive.com/v1";

export type CrmConfig = { token: string; pipelineId: number | null; stageId: number | null; domain: string | null };

export function crmConfig(env: Record<string, string | undefined> = process.env): CrmConfig | null {
  const token = env.PIPEDRIVE_API_TOKEN;
  if (!token) return null;
  const num = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : null);
  const domain = env.PIPEDRIVE_COMPANY_DOMAIN && /^[a-z0-9-]{1,63}$/.test(env.PIPEDRIVE_COMPANY_DOMAIN) ? env.PIPEDRIVE_COMPANY_DOMAIN : null;
  return { token, pipelineId: num(env.PIPEDRIVE_PIPELINE_ID), stageId: num(env.PIPEDRIVE_STAGE_ID), domain };
}

export function dealUrl(id: number, domain: string | null = crmConfig()?.domain ?? null): string {
  return domain ? `https://${domain}.pipedrive.com/deal/${id}` : `https://app.pipedrive.com/deal/${id}`;
}

export class CrmError extends Error {
  constructor(message: string, readonly retry: boolean) {
    super(message);
  }
}

type Res<T> = { success?: boolean; data?: T; error?: string };

export class Pipedrive {
  constructor(private readonly c: CrmConfig, private readonly f: typeof fetch = fetch) {}

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await this.f(`${API}${path}`, {
        method,
        headers: { "x-api-token": this.c.token, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch (e) {
      throw new CrmError(`Pipedrive nicht erreichbar: ${String(e).slice(0, 120)}`, true);
    }
    const json = (await res.json().catch(() => ({}))) as Res<T>;
    if (!res.ok || json.success === false) {
      const msg = res.status === 401 ? "API-Token ungültig" : res.status === 404 ? "nicht gefunden" : (json.error ?? `HTTP ${res.status}`);
      throw new CrmError(`Pipedrive: ${msg}`.slice(0, 300), res.status === 429 || res.status >= 500);
    }
    return json.data as T;
  }

  getDeal(id: number) {
    return this.call<{ id: number; title: string; status: string; org_id?: { value: number; name: string } | number | null }>("GET", `/deals/${id}`);
  }

  async findOrCreateOrganization(name: string): Promise<number> {
    const found = await this.call<{ items: { item: { id: number; name: string } }[] }>("GET", `/organizations/search?term=${encodeURIComponent(name)}&exact_match=true&limit=1`);
    const hit = found?.items?.[0]?.item;
    if (hit) return hit.id;
    return (await this.call<{ id: number }>("POST", "/organizations", { name })).id;
  }

  async createDeal(d: { title: string; orgId: number; value: number | null }): Promise<number> {
    const body: Record<string, unknown> = { title: d.title, org_id: d.orgId };
    if (this.c.pipelineId) body.pipeline_id = this.c.pipelineId;
    if (this.c.stageId) body.stage_id = this.c.stageId;
    if (d.value !== null) Object.assign(body, { value: d.value, currency: "EUR" });
    return (await this.call<{ id: number }>("POST", "/deals", body)).id;
  }

  markWon(dealId: number) {
    return this.call("PUT", `/deals/${dealId}`, { status: "won" });
  }

  addNote(dealId: number, content: string) {
    return this.call("POST", "/notes", { deal_id: dealId, content });
  }

  /** Lead from the contact form: person (found by e-mail or created), optional organisation, then the lead. */
  async createLead(c: { name: string; email: string; phone: string | null; company: string | null; message: string }): Promise<string> {
    const orgId = c.company ? await this.findOrCreateOrganization(c.company) : null;
    const found = await this.call<{ items: { item: { id: number } }[] }>("GET", `/persons/search?term=${encodeURIComponent(c.email)}&fields=email&exact_match=true&limit=1`);
    const personId =
      found?.items?.[0]?.item?.id ??
      (
        await this.call<{ id: number }>("POST", "/persons", {
          name: c.name,
          email: [{ value: c.email, primary: true }],
          ...(c.phone ? { phone: [{ value: c.phone, primary: true }] } : {}),
          ...(orgId ? { org_id: orgId } : {}),
        })
      ).id;
    const lead = await this.call<{ id: string }>("POST", "/leads", {
      title: `recrewted-Anfrage: ${c.company ?? c.name}`.slice(0, 200),
      person_id: personId,
      ...(orgId ? { organization_id: orgId } : {}),
    });
    await this.call("POST", "/notes", { lead_id: lead.id, content: `<p><b>Anfrage über recrewted.de/kontakt</b></p><p>${escapeHtml(c.message).replace(/\n/g, "<br>")}</p>` });
    return lead.id;
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}
