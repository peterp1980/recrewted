import { describe, expect, it, vi } from "vitest";
import { employmentFrom, htmlToLines, toBriefing } from "./normalize";
import { fetchJobs, jobLinks, jobPostingsFromHtml, parseGreenhouse, parseLever, parsePersonio, parseRecruitee, parseSmartRecruitersPosting, parseWorkable, validSource } from "./providers";

const HTML = `<p>Wir sind ein Reiseunternehmen.</p>
<h3>Deine Aufgaben</h3><ul><li>Reisebusse fahren</li><li>Gäste betreuen</li></ul>
<p><strong>Das bringst du mit:</strong><br></p><ul><li>Führerschein Klasse D</li></ul>
<h3>Von Vorteil</h3><ul><li>Englisch</li></ul>
<h3>Wir bieten</h3><ul><li>Fester Bus &amp; feste Touren</li></ul>`;

describe("normalize", () => {
  it("splits a job text into briefing lists by headings", () => {
    const b = toBriefing({ externalId: "1", title: " Busfahrer (m/w/d) ", url: "https://x.de/1", location: "Witten", postalCode: "58452", remote: "onsite", employmentType: "full_time", description: HTML, salaryMin: null, salaryMax: null, salaryPeriod: "year" });
    expect(b.title).toBe("Busfahrer (m/w/d)");
    expect(b.tasks).toEqual(["Reisebusse fahren", "Gäste betreuen"]);
    expect(b.mustHave).toEqual(["Führerschein Klasse D"]);
    expect(b.niceToHave).toEqual(["Englisch"]);
    expect(b.benefits).toEqual(["Fester Bus & feste Touren"]);
    expect(b.notes).toContain("Wir sind ein Reiseunternehmen.");
    expect(b.notes).toContain("Importiert aus https://x.de/1");
    expect(b.postalCode).toBe("58452");
  });
  it("decodes double-escaped HTML", () => {
    expect(htmlToLines("&lt;li&gt;Fahren &amp;amp; Planen&lt;/li&gt;")).toEqual(["- Fahren & Planen"]);
  });
  it("maps employment types", () => {
    expect(employmentFrom("Vollzeit")).toBe("full_time");
    expect(employmentFrom("part-time")).toBe("part_time");
    expect(employmentFrom("Werkstudent/in")).toBe("working_student");
    expect(employmentFrom("FULL_TIME")).toBe("full_time");
    expect(employmentFrom("")).toBeNull();
  });
});

describe("providers", () => {
  it("validates sources", () => {
    expect(validSource("personio", "hafermann")).toBe(true);
    expect(validSource("personio", "../etc")).toBe(false);
    expect(validSource("lever", "eu:acme")).toBe(true);
    expect(validSource("jsonld", "https://karriere.hafermann.de/jobs")).toBe(true);
    expect(validSource("jsonld", "http://localhost/jobs")).toBe(false);
  });

  it("parses Personio XML", () => {
    const xml = `<?xml version="1.0"?><workzag-jobs><position><id>123</id><office>Witten</office><name>Busfahrer (m/w/d)</name><employmentType>permanent</employmentType><schedule>full-time</schedule><jobDescriptions><jobDescription><name>Deine Aufgaben</name><value><![CDATA[<ul><li>Fahren</li></ul>]]></value></jobDescription></jobDescriptions></position></workzag-jobs>`;
    const [j] = parsePersonio(xml, "hafermann");
    expect(j).toMatchObject({ externalId: "123", title: "Busfahrer (m/w/d)", location: "Witten", employmentType: "full_time", url: "https://hafermann.jobs.personio.de/job/123" });
    expect(toBriefing(j).tasks).toEqual(["Fahren"]);
  });

  it("parses Greenhouse, Lever, Recruitee, Workable, SmartRecruiters", () => {
    expect(parseGreenhouse({ jobs: [{ id: 7, title: "Dev", absolute_url: "https://g/7", location: { name: "Berlin (Hybrid)" }, content: "&lt;p&gt;Hi&lt;/p&gt;" }] })[0]).toMatchObject({ externalId: "7", remote: "hybrid", location: "Berlin (Hybrid)" });
    expect(parseLever([{ id: "a1", text: "Sales", hostedUrl: "https://l/a1", categories: { location: "München", commitment: "Full-time" }, lists: [{ text: "Requirements", content: "<li>Deutsch</li>" }], salaryRange: { min: 50000, max: 60000, interval: "per-year-salary" } }])[0]).toMatchObject({ externalId: "a1", employmentType: "full_time", salaryMin: 50000, salaryPeriod: "year" });
    expect(parseRecruitee({ offers: [{ id: 5, title: "Pflege", city: "Hamburg", postal_code: "20095", remote: false, employment_type_code: "parttime", description: "<p>x</p>", requirements: "<ul><li>Examen</li></ul>", careers_url: "https://r/5" }] })[0]).toMatchObject({ postalCode: "20095", employmentType: "part_time" });
    expect(parseWorkable({ jobs: [{ shortcode: "AB12", title: "Koch", city: "Köln", telecommuting: false, employment_type: "Full-time", url: "https://w/AB12", description: "<p>x</p>" }] })[0]).toMatchObject({ externalId: "AB12", employmentType: "full_time" });
    expect(parseSmartRecruitersPosting({ id: "9", name: "Lager", location: { city: "Bremen", postalCode: "28195", remote: false }, typeOfEmployment: { label: "Vollzeit" }, jobAd: { sections: { jobDescription: { title: "Aufgaben", text: "<ul><li>Kommissionieren</li></ul>" } } } })).toMatchObject({ externalId: "9", location: "Bremen", employmentType: "full_time" });
  });

  it("reads JobPosting data, also in @graph", () => {
    const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},{"@type":"JobPosting","title":"Elektroniker (m/w/d)","identifier":{"value":"E-1"},"employmentType":["FULL_TIME"],"jobLocation":{"address":{"addressLocality":"München","postalCode":"80331"}},"baseSalary":{"value":{"minValue":42000,"maxValue":52000,"unitText":"YEAR"}},"description":"<h3>Ihre Aufgaben</h3><ul><li>Wartung</li></ul>"}]}</script><script type="application/ld+json">{broken</script>`;
    const [j] = jobPostingsFromHtml(html, "https://k.de/jobs/e1");
    expect(j).toMatchObject({ externalId: "E-1", title: "Elektroniker (m/w/d)", postalCode: "80331", salaryMin: 42000, employmentType: "full_time" });
  });

  it("finds job links on the same host only", () => {
    const html = `<a href="/jobs/1">1</a><a href="https://k.de/stellen/2#x">2</a><a href="https://other.de/jobs/3">3</a><a href="/impressum">i</a>`;
    expect(jobLinks(html, "https://k.de/karriere")).toEqual(["https://k.de/jobs/1", "https://k.de/stellen/2"]);
  });

  it("follows job links when the career page itself has no JobPosting", async () => {
    const f = vi.fn(async (url: string) => {
      if (url === "https://k.de/karriere") return new Response(`<a href="/jobs/1">Job</a>`, { status: 200 });
      return new Response(`<script type="application/ld+json">{"@type":"JobPosting","title":"Job 1","url":"https://k.de/jobs/1"}</script>`, { status: 200 });
    });
    const jobs = await fetchJobs("jsonld", "https://k.de/karriere", f as unknown as typeof fetch);
    expect(jobs.map((j) => j.title)).toEqual(["Job 1"]);
  });

  it("reports a missing source clearly", async () => {
    const f = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    await expect(fetchJobs("greenhouse", "nope", f)).rejects.toThrow("Quelle nicht gefunden");
  });
});
