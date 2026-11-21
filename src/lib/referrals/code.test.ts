import { describe, expect, it } from "vitest";
import { newReferralCode, refParam, referralLink, withRef } from "./code";

describe("referral codes", () => {
  it("creates valid, distinct codes", () => {
    const codes = new Set(Array.from({ length: 200 }, newReferralCode));
    expect(codes.size).toBe(200);
    for (const c of codes) expect(refParam(c)).toBe(c);
  });
  it("accepts only well-formed codes", () => {
    expect(refParam("abc")).toBeNull();
    expect(refParam("ABCDEFGH12")).toBeNull();
    expect(refParam("abcdefgh12; drop")).toBeNull();
    expect(refParam(["abcdefgh12"])).toBeNull();
    expect(refParam("abcdefgh12")).toBe("abcdefgh12");
  });
  it("builds share links and keeps other params", () => {
    expect(referralLink("https://jobs.example.de/", "abcdefgh12")).toBe("https://jobs.example.de/?ref=abcdefgh12");
    expect(referralLink("https://recrewted.de/karriere/hafermann", "abcdefgh12")).toBe("https://recrewted.de/karriere/hafermann?ref=abcdefgh12");
    expect(withRef("/jobs/x-1?quelle=karriereseite", "abcdefgh12")).toBe("/jobs/x-1?quelle=karriereseite&ref=abcdefgh12");
    expect(withRef("/jobs/x-1", "abcdefgh12")).toBe("/jobs/x-1?ref=abcdefgh12");
    expect(withRef("/jobs/x-1", null)).toBe("/jobs/x-1");
  });
});
