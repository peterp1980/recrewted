import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./token";

const ID = "3f2b1c4d-1234-4abc-8def-0123456789ab";
describe("data request token", () => {
  it("verifies within 24 hours only, with the right secret", () => {
    const t = signToken(ID, "s3cret", 0);
    expect(verifyToken(t, "s3cret", 1000)).toBe(ID);
    expect(verifyToken(t, "other", 1000)).toBeNull();
    expect(verifyToken(t, "s3cret", 25 * 3600 * 1000)).toBeNull();
  });
  it("rejects tampered tokens", () => {
    const t = signToken(ID, "s3cret", 0);
    const forged = Buffer.from(`${ID.replace("3f", "4f")}.99999999999`).toString("base64url") + "." + t.split(".")[1];
    expect(verifyToken(forged, "s3cret", 0)).toBeNull();
    expect(verifyToken("x", "s3cret")).toBeNull();
  });
});
