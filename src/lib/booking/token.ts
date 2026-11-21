import { createHmac, timingSafeEqual } from "node:crypto";

// Personal booking link for one application. Signed with a key derived from DATA_REQUEST_SECRET
// under its own label, so it can never be used as a profile or data-request link. No personal data inside.

export const BOOKING_DAYS = 30;
const key = (secret: string) => createHmac("sha256", secret).update("recrewted:booking").digest();

export function signBookingToken(applicationId: string, secret: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + BOOKING_DAYS * 86400;
  const payload = `${applicationId}.${exp}`;
  const sig = createHmac("sha256", key(secret)).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyBookingToken(token: string, secret: string, now = Date.now()): string | null {
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
