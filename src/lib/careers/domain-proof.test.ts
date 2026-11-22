import { describe, expect, it } from "vitest";
import { domainProof, newNonce, proofMatches } from "./domain-proof";

describe("domain proof", () => {
  it("matches only for the same host, nonce and secret", () => {
    const n = newNonce();
    const p = domainProof("Karriere.A.de", n, "s3cret");
    expect(proofMatches("karriere.a.de", n, p, "s3cret")).toBe(true);
    expect(proofMatches("karriere.b.de", n, p, "s3cret")).toBe(false);
    expect(proofMatches("karriere.a.de", newNonce(), p, "s3cret")).toBe(false);
    expect(proofMatches("karriere.a.de", n, p, "other")).toBe(false);
    expect(proofMatches("karriere.a.de", n, undefined, "s3cret")).toBe(false);
  });
});
