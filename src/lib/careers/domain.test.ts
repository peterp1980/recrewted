import { describe, expect, it } from "vitest";
import { dnsRecord, isOwnHost, normalizeDomain } from "./domain";

describe("career domains", () => {
  it("normalizes what people paste", () => {
    expect(normalizeDomain("https://Karriere.Hafermann-Reisen.de/jobs?x=1")).toBe("karriere.hafermann-reisen.de");
    expect(normalizeDomain("jobs.projx.de.")).toBe("jobs.projx.de");
    expect(normalizeDomain("projx.de:443")).toBe("projx.de");
  });
  it("rejects invalid hosts and our own domains", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("nur-text")).toBeNull();
    expect(normalizeDomain("a b.de")).toBeNull();
    expect(normalizeDomain("-x.de")).toBeNull();
    expect(normalizeDomain("recrewted.de")).toBeNull();
    expect(normalizeDomain("karriere.recrewted.de")).toBeNull();
    expect(normalizeDomain("foo.vercel.app")).toBeNull();
  });
  it("knows our hosts", () => {
    expect(isOwnHost("recrewted-git-mvp-peter-petr.vercel.app")).toBe(true);
    expect(isOwnHost("localhost:3000")).toBe(true);
    expect(isOwnHost("karriere.hafermann-reisen.de")).toBe(false);
  });
  it("explains the DNS record", () => {
    expect(dnsRecord("karriere.hafermann-reisen.de")).toEqual({ type: "CNAME", name: "karriere", value: "cname.vercel-dns.com" });
    expect(dnsRecord("jobs.team.projx.de")).toEqual({ type: "CNAME", name: "jobs.team", value: "cname.vercel-dns.com" });
    expect(dnsRecord("hafermann-karriere.de")).toEqual({ type: "A", name: "@", value: "76.76.21.21" });
  });
});
