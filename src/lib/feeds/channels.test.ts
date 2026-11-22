import { describe, expect, it } from "vitest";
import { emptyBriefing } from "@/lib/briefing/schema";
import type { PublicJob } from "@/lib/jobs/format";
import { channelOn, CHANNELS, feedLink } from "./channels";
import { indeedFormatFeed, linkedinFeed } from "./xml";
import { channelStatuses } from "./status";

const job: PublicJob = {
  id: "3f2b1c4d-1234-4abc-8def-0123456789ab", organizationId: "org-secret", title: "Fahrer <m/w/d>", location: "Witten", postalCode: "58452", latitude: null, longitude: null,
  remote: false, employmentType: "full_time", category: "logistics", salaryMin: null, salaryMax: null, salaryPeriod: "year",
  publishedAt: "2026-11-21T10:00:00.000Z", employerName: null, employerWebsite: null, employer: null,
  briefing: { ...emptyBriefing(), tasks: ["Fahren"] }, adText: null, tone: "sie",
};

describe("channels", () => {
  it("needs the global switch and no customer exception", () => {
    const s = { global: { indeed: true, jooble: false }, customerOff: { indeed: ["org-b"] } };
    expect(channelOn(s, "indeed", "org-a")).toBe(true);
    expect(channelOn(s, "indeed", "org-b")).toBe(false);
    expect(channelOn(s, "jooble", "org-a")).toBe(false);
    expect(channelOn(s, "talent", "org-a")).toBe(false);
  });
  it("attributes feed clicks to the channel", () => {
    expect(feedLink("https://recrewted.de/jobs/x", "jooble")).toBe("https://recrewted.de/jobs/x?utm_source=jooble&utm_medium=job_feed&utm_campaign=feed-jooble");
  });
  it("has unique keys", () => expect(new Set(CHANNELS.map((c) => c.key)).size).toBe(CHANNELS.length));
});

describe("feeds", () => {
  it("writes the Indeed format with the channel's link and no internal ids", () => {
    const xml = indeedFormatFeed([job], "https://recrewted.de", "kimeta", new Date("2026-11-22T10:00:00Z"));
    expect(xml).toContain("utm_source=kimeta");
    expect(xml).toContain("<company><![CDATA[recrewted]]></company>");
    expect(xml).not.toContain("org-secret");
    expect(xml).not.toContain("<salary>");
  });
  it("writes the LinkedIn format", () => {
    const xml = linkedinFeed([job], "https://recrewted.de", new Date("2026-11-22T10:00:00Z"));
    expect(xml).toContain("<partnerJobId><![CDATA[3f2b1c4d-1234-4abc-8def-0123456789ab]]></partnerJobId>");
    expect(xml).toContain("<workplaceTypes>On-site</workplaceTypes>");
    expect(xml).toContain("<jobtype>FULL_TIME</jobtype>");
    expect(xml).toContain("<expectedJobCount>1</expectedJobCount>");
    expect(xml).toContain("Fahrer <m/w/d>");
    expect(xml).not.toContain("org-secret");
  });
});

describe("status per vacancy", () => {
  const s = { global: { google: true, indeed: true }, customerOff: { indeed: ["org-a"] } };
  it("shows why a channel is not live", () => {
    const list = channelStatuses({ status: "active", organizationId: "org-a" }, s);
    const st = (k: string) => list.find((x) => x.key === k)?.state;
    expect(st("jobboard")).toBe("online");
    expect(st("google")).toBe("online");
    expect(st("indeed")).toBe("customerOff");
    expect(st("jooble")).toBe("off");
    expect(st("ba")).toBe("setup");
    expect(channelStatuses({ status: "filled", organizationId: "org-b" }, s).find((x) => x.key === "indeed")?.state).toBe("offline");
  });
});

describe("status per vacancy", () => {
  const s = { global: { google: true, indeed: true }, customerOff: { indeed: ["org-a"] } };
  it("shows why a channel is not live", () => {
    const list = channelStatuses({ status: "active", organizationId: "org-a" }, s);
    const st = (k: string) => list.find((x) => x.key === k)?.state;
    expect(st("jobboard")).toBe("online");
    expect(st("google")).toBe("online");
    expect(st("indeed")).toBe("customerOff");
    expect(st("jooble")).toBe("off");
    expect(st("ba")).toBe("setup");
    expect(channelStatuses({ status: "filled", organizationId: "org-b" }, s).find((x) => x.key === "indeed")?.state).toBe("offline");
  });
});
