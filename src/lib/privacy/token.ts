import { createHmac, timingSafeEqual } from "node:crypto";

// Signed, time-limited link for data subject requests (Auskunft/Löschung).
// Contains the candidate ID and expiry; no personal data.

export const TOKEN_HOURS = 24;

export function signToken(candidateId: string, secret: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + TOKEN_HOURS * 3600;
  const payload = `${candidateId}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyToken(token: string, secret: string, now = Date.now()): string | null {
  const [p, sig] = token.split(".");
  if (!p || !sig) return null;
  const payload = Buffer.from(p, "base64url").toString();
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [id, exp] = payload.split(".");
  if (!/^[0-9a-f-]{36}$/.test(id ?? "") || Number(exp) * 1000 < now) return null;
  return id;
}
