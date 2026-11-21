import { createHmac, timingSafeEqual } from "node:crypto";

// Personal link to the applicant profile. Signed with a key derived from DATA_REQUEST_SECRET,
// so a profile link can never be used as a data-request link and vice versa. No personal data inside.

export const PROFILE_DAYS = 30;
const key = (secret: string) => createHmac("sha256", secret).update("recrewted:profile").digest();

export function signProfileToken(candidateId: string, secret: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + PROFILE_DAYS * 86400;
  const payload = `${candidateId}.${exp}`;
  const sig = createHmac("sha256", key(secret)).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyProfileToken(token: string, secret: string, now = Date.now()): string | null {
  const [p, sig] = token.split(".");
  if (!p || !sig) return null;
  const payload = Buffer.from(p, "base64url").toString();
  const expected = createHmac("sha256", key(secret)).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [id, exp] = payload.split(".");
  if (!/^[0-9a-f-]{36}$/.test(id ?? "") || Number(exp) * 1000 < now) return null;
  return id;
}
