import { createHmac, timingSafeEqual } from "node:crypto";

// Personal link to the one-question survey after a decision. Own key label, 30 days, no personal data inside.

export const SURVEY_DAYS = 30;
const key = (secret: string) => createHmac("sha256", secret).update("recrewted:survey").digest();

export function signSurveyToken(applicationId: string, secret: string, now = Date.now()): string {
  const payload = `${applicationId}.${Math.floor(now / 1000) + SURVEY_DAYS * 86400}`;
  return `${Buffer.from(payload).toString("base64url")}.${createHmac("sha256", key(secret)).update(payload).digest("base64url")}`;
}

export function verifySurveyToken(token: string, secret: string, now = Date.now()): string | null {
  const [p, sig] = token.split(".");
  if (!p || !sig) return null;
  const payload = Buffer.from(p, "base64url").toString();
  const a = Buffer.from(sig);
  const b = Buffer.from(createHmac("sha256", key(secret)).update(payload).digest("base64url"));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [id, exp] = payload.split(".");
  if (!/^[0-9a-f-]{36}$/.test(id ?? "") || Number(exp) * 1000 < now) return null;
  return id;
}
