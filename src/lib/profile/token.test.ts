import { describe, expect, it } from "vitest";
import { signToken } from "@/lib/privacy/token";
import { PROFILE_DAYS, signProfileToken, verifyProfileToken } from "./token";

const ID = "40000000-0000-0000-0000-000000000001";

describe("profile links", () => {
  it("round-trips and expires after 30 days", () => {
    const t = signProfileToken(ID, "s");
    expect(verifyProfileToken(t, "s")).toBe(ID);
    expect(verifyProfileToken(t, "s", Date.now() + (PROFILE_DAYS + 1) * 86_400_000)).toBeNull();
    expect(verifyProfileToken(t, "other")).toBeNull();
    expect(verifyProfileToken(`${t}x`, "s")).toBeNull();
  });
  it("is not interchangeable with data-request links", () => {
    expect(verifyProfileToken(signToken(ID, "s"), "s")).toBeNull();
  });
});
