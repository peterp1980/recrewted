import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

// Customers' ATS API keys, encrypted with AES-256-GCM before they reach the database.
// The key is derived from DATA_REQUEST_SECRET with its own label, so it is never the same
// key as the one signing links. Rotating DATA_REQUEST_SECRET means re-entering the ATS keys.

const key = (master: string) => createHmac("sha256", master).update("recrewted:ats-secret").digest();

export function encryptSecret(plain: string, master: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(master), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1:${Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64url")}`;
}

export function decryptSecret(enc: string, master: string): string | null {
  if (!enc.startsWith("v1:")) return null;
  try {
    const raw = Buffer.from(enc.slice(3), "base64url");
    const d = createDecipheriv("aes-256-gcm", key(master), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Shown instead of the key: last four characters only. */
export const secretHint = (plain: string) => `…${plain.slice(-4)}`;
