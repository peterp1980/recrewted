import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Proof that a customer domain really reaches this deployment: the checker sends a random nonce to
// https://<domain>/api/domain-check, and only our own server can answer with the matching signature.
// That covers DNS, the TLS certificate and the routing in one request, without any hosting API.

const key = (secret: string) => createHmac("sha256", secret).update("recrewted:domain-check").digest();

export function domainProof(host: string, nonce: string, secret: string): string {
  return createHmac("sha256", key(secret)).update(`${host.toLowerCase()}|${nonce}`).digest("base64url");
}

export function newNonce(): string {
  return randomBytes(16).toString("base64url");
}

export function proofMatches(host: string, nonce: string, proof: unknown, secret: string): boolean {
  if (typeof proof !== "string") return false;
  const a = Buffer.from(proof);
  const b = Buffer.from(domainProof(host, nonce, secret));
  return a.length === b.length && timingSafeEqual(a, b);
}
