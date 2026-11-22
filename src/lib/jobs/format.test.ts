import { describe, expect, it } from "vitest";
import { emptyBriefing } from "@/lib/briefing/schema";
import { descriptionHtml, distanceKm, idFromSlug, jobPath, jobPostingJsonLd, jsonLdScript, salaryText, slugify, type PublicJob } from "./format";

const ID = "3f2b1c4d-1234-4abc-8def-0123456789ab";
const job: PublicJob = {
  id: ID, organizationId: "o", title: "Elektroniker (m/w/d)", location: "München", postalCode: "80331", latitude: 48.137, longitude: 11.575,
  remote: false, employmentType: "full_time", category: "craft", salaryMin: 42000, salaryMax: 52000, salaryPeriod: "year",
  publishedAt: "2026-11-01T10:00:00.000Z", employerName: "Muster GmbH", employerWebsite: "https://muster.de", employer: null,
  briefing: { ...emptyBriefing(), tasks: ["Wartung <Anlagen>"], mustHave: ["Ausbildung"] },
  adText: null,
  tone: "sie",
};

describe("urls", () => {
  it("builds readable slugs with the id at the end", () => {
    expect(slugify("Elektroniker (m/w/d) München")).toBe("elektroniker-muenchen");
    expect(jobPath(job)).toBe(`/jobs/elektroniker-muenchen--${ID}`);
    expect(idFromSlug(`elektroniker-muenchen--${ID}`)).toBe(ID);
    expect(idFromSlug(ID.toUpperCase())).toBe(ID);
    expect(idFromSlug("elektroniker")).toBeNull();
  });
});

describe("salaryText", () => {
  it("formats ranges in German", () => {
    expect(salaryText(42000, 52000, "year")?.replace(/ /g, " ")).toBe("42.000 € – 52.000 € pro Jahr");
    expect(salaryText(15.5, 15.5, "hour")?.replace(/ /g, " ")).toBe("15,50 € pro Stunde");
    expect(salaryText(null, 5, "year")).toBeNull();
  });
});

describe("distanceKm", () => {
  it("measures Munich–Augsburg at about 57 km", () => {
    expect(distanceKm({ lat: 48.137, lng: 11.575 }, { lat: 48.366, lng: 10.898 })).toBeCloseTo(56.6, 0);
  });
});

describe("JobPosting", () => {
  const ld = jobPostingJsonLd(job, "https://recrewted.de");

  it("contains the fields Google requires, including salary", () => {
    expect(ld).toMatchObject({
      "@type": "JobPosting",
      title: "Elektroniker (m/w/d)",
      datePosted: "2026-11-01T10:00:00.000Z",
      validThrough: "2026-12-31T10:00:00.000Z",
      employmentType: "FULL_TIME",
      hiringOrganization: { name: "Muster GmbH", sameAs: "https://muster.de" },
      jobLocation: { address: { addressLocality: "München", postalCode: "80331", addressCountry: "DE" } },
      baseSalary: { currency: "EUR", value: { minValue: 42000, maxValue: 52000, unitText: "YEAR" } },
      directApply: true,
      url: `https://recrewted.de/jobs/elektroniker-muenchen--${ID}`,
    });
  });

  it("escapes HTML in the description", () => {
    expect(descriptionHtml(job.briefing)).toContain("Wartung &lt;Anlagen&gt;");
    expect(descriptionHtml(job.briefing)).toContain("Ihre Aufgaben");
    expect(descriptionHtml(job.briefing, null, "du")).toContain("Deine Aufgaben");
    expect(descriptionHtml(job.briefing, "Absatz <b>1</b>\nZeile\n\nAbsatz 2")).toBe("<p>Absatz &lt;b&gt;1&lt;/b&gt;<br>Zeile</p><p>Absatz 2</p>");
  });

  it("names recrewted for confidential searches and marks remote jobs", () => {
    const anon = jobPostingJsonLd({ ...job, employerName: null, remote: true }, "https://recrewted.de");
    expect(anon.hiringOrganization).toMatchObject({ name: "recrewted" });
    expect(anon).toMatchObject({ jobLocationType: "TELECOMMUTE" });
    expect(anon).not.toHaveProperty("jobLocation");
  });

  it("cannot break out of the script tag", () => {
    expect(jsonLdScript({ t: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});
