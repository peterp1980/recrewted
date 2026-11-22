import { describe, expect, it } from "vitest";
import { emptyBriefing } from "@/lib/briefing/schema";
import type { PublicJob } from "@/lib/jobs/format";
import { indeedFeed } from "./indeed";

const job: PublicJob = {
  id: "3f2b1c4d-1234-4abc-8def-0123456789ab", title: "Elektroniker (m/w/d)", location: "München", postalCode: "80331", latitude: null, longitude: null,
  remote: false, employmentType: "full_time", category: "craft", salaryMin: 42000, salaryMax: 52000, salaryPeriod: "year",
  publishedAt: "2026-11-01T10:00:00.000Z", employerName: "Muster GmbH", employerWebsite: null, employer: null,
  briefing: { ...emptyBriefing(), tasks: ["A ]]> B"] }, adText: null, tone: "sie",
};

describe("Indeed feed", () => {
  const xml = indeedFeed([job], "https://recrewted.de", new Date("2026-11-21T00:00:00Z"));
  it("contains the job with tracking URL, salary and type", () => {
    expect(xml).toContain("<title><![CDATA[Elektroniker (m/w/d)]]></title>");
    expect(xml).toContain("utm_source=indeed");
    expect(xml).toContain("<salary><![CDATA[42000-52000 EUR per year]]></salary>");
    expect(xml).toContain("<jobtype><![CDATA[fulltime]]></jobtype>");
  });
  it("cannot break out of CDATA", () => {
    const evil = indeedFeed([{ ...job, title: "X ]]></title><job>" }], "https://recrewted.de");
    expect(evil).toContain("]]]]><![CDATA[>");
    expect(evil.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "").match(/<job>/g)).toHaveLength(1);
  });
});

import { portalStatuses } from "./status";
describe("portal status", () => {
  it("is online only when active with salary; BA/StepStone wait for contracts", () => {
    const on = portalStatuses({ status: "active", salaryMin: 1, salaryMax: 2 });
    expect(on.map((p) => p.state)).toEqual(["online", "online", "online", "contract", "contract"]);
    expect(portalStatuses({ status: "filled", salaryMin: 1, salaryMax: 2 })[0]).toEqual({ key: "jobboard", state: "offline", reason: "notActive" });
    expect(portalStatuses({ status: "active", salaryMin: null, salaryMax: 2 })[2]).toEqual({ key: "indeed", state: "error", reason: "noSalary" });
  });
});
