import "server-only";

// Registers customer domains with the Vercel project and reads their status.
// Optional: needs VERCEL_API_TOKEN (secret), VERCEL_PROJECT_ID and, for team projects, VERCEL_TEAM_ID.
// VERCEL_DOMAIN_BRANCH binds domains to a branch (e.g. "mvp") as long as production runs elsewhere.

const API = "https://api.vercel.com";

function config() {
  const token = process.env.VERCEL_API_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;
  if (!token || !project) return null;
  const team = process.env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "";
  return { token, project, team, branch: process.env.VERCEL_DOMAIN_BRANCH || undefined };
}

export const vercelConfigured = () => config() !== null;

async function call(path: string, init: RequestInit = {}) {
  const c = config();
  if (!c) return null;
  const res = await fetch(`${API}${path}${c.team}`, {
    ...init,
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body: body as Record<string, unknown> };
}

/** Adds the domain to the project (idempotent: "already exists" counts as success). */
export async function addDomain(domain: string): Promise<boolean> {
  const c = config();
  if (!c) return false;
  const r = await call(`/v10/projects/${c.project}/domains`, { method: "POST", body: JSON.stringify({ name: domain, ...(c.branch ? { gitBranch: c.branch } : {}) }) });
  return !!r && (r.ok || r.status === 409);
}

export async function removeDomain(domain: string): Promise<void> {
  const c = config();
  if (c) await call(`/v9/projects/${c.project}/domains/${encodeURIComponent(domain)}`, { method: "DELETE" });
}

export type DomainStatus = { state: "ok" | "dns_missing" | "verification" | "unknown"; verification: { type: string; domain: string; value: string }[] };

/** Whether DNS points to Vercel and whether the domain is verified (needed if it is used in another Vercel account). */
export async function domainStatus(domain: string): Promise<DomainStatus> {
  const c = config();
  if (!c) return { state: "unknown", verification: [] };
  const [project, dns] = await Promise.all([
    call(`/v9/projects/${c.project}/domains/${encodeURIComponent(domain)}`),
    call(`/v6/domains/${encodeURIComponent(domain)}/config`),
  ]);
  if (!project?.ok) return { state: "unknown", verification: [] };
  const verification = Array.isArray(project.body.verification) ? (project.body.verification as DomainStatus["verification"]) : [];
  if (project.body.verified === false) return { state: "verification", verification };
  if (dns?.ok && dns.body.misconfigured === true) return { state: "dns_missing", verification };
  return { state: dns?.ok ? "ok" : "unknown", verification };
}
