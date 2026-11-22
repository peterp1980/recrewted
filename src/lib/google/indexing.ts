import { createSign } from "node:crypto";

// Google Indexing API (allowed for pages with JobPosting data). A service account signs a JWT,
// exchanges it for an access token and reports URLs as updated or deleted.
//   GOOGLE_INDEXING_CLIENT_EMAIL – the service account's e-mail
//   GOOGLE_INDEXING_PRIVATE_KEY  – its private key (PEM; "\n" may be escaped). Secret.
// The service account must be an owner of the site in Google Search Console.

export type IndexingConfig = { email: string; key: string };

export function indexingConfig(env: Record<string, string | undefined> = process.env): IndexingConfig | null {
  const email = env.GOOGLE_INDEXING_CLIENT_EMAIL;
  const key = env.GOOGLE_INDEXING_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key || !key.includes("PRIVATE KEY")) return null;
  return { email, key };
}

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

export function signedJwt(c: IndexingConfig, now = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: c.email,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const sig = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(c.key);
  return `${header}.${claims}.${b64url(sig)}`;
}

export class IndexingError extends Error {
  constructor(message: string, readonly retry: boolean) {
    super(message);
  }
}

let cached: { token: string; until: number } | null = null;

async function accessToken(c: IndexingConfig, f: typeof fetch): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const res = await f("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: signedJwt(c) }).toString(),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !body.access_token) throw new IndexingError(`Google-Anmeldung fehlgeschlagen: ${body.error_description ?? res.status}`, res.status >= 500);
  cached = { token: body.access_token, until: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cached.token;
}

export async function notifyGoogle(url: string, kind: "updated" | "deleted", c: IndexingConfig, f: typeof fetch = fetch): Promise<void> {
  const token = await accessToken(c, f);
  const res = await f("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, type: kind === "updated" ? "URL_UPDATED" : "URL_DELETED" }),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.ok) return;
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  const msg = res.status === 403 ? "Kein Zugriff – ist das Dienstkonto Inhaber der Property in der Search Console?" : res.status === 429 ? "Tageskontingent erreicht" : (body.error?.message ?? `HTTP ${res.status}`);
  throw new IndexingError(`Google: ${msg}`.slice(0, 300), res.status === 429 || res.status >= 500);
}

/** For tests. */
export const resetTokenCache = () => {
  cached = null;
};
