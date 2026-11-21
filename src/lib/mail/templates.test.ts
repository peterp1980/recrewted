import { describe, expect, it } from "vitest";
import { renderMail } from "./templates";

describe("renderMail", () => {
  it("fills the confirmation", () => {
    const m = renderMail("application_received", { firstName: "Eva", jobTitle: "Elektroniker (m/w/d)", employer: "Muster GmbH" });
    expect(m.subject).toBe("Ihre Bewerbung als Elektroniker (m/w/d)");
    expect(m.text).toContain("Hallo Eva,");
    expect(m.text).toContain("bei Muster GmbH");
  });

  it("does not name the employer in confidential searches", () => {
    expect(renderMail("knockout_rejection", { firstName: "Eva", jobTitle: "Elektroniker", employer: null }).text).not.toContain(" bei ");
  });

  it("strips line breaks from variables (no header injection)", () => {
    const m = renderMail("application_received", { firstName: "Eva", jobTitle: "Job\r\nBcc: x@evil.example" });
    expect(m.subject).not.toMatch(/[\r\n]/);
  });

  it("puts the link into the data request mail", () => {
    expect(renderMail("data_request", { firstName: "Eva", jobTitle: "", link: "https://recrewted.de/datenschutz/anfrage/abc" }).text).toContain("https://recrewted.de/datenschutz/anfrage/abc");
  });
});

describe("form of address", () => {
  const d = { firstName: "Mia", jobTitle: "Werkstudent:in", employer: "projx GmbH" };
  it("uses du for employers that want it and stays formal otherwise", () => {
    expect(renderMail("application_received", { ...d, tone: "du" }).text).toContain("danke für deine Bewerbung");
    expect(renderMail("application_received", { ...d, tone: "du" }).subject).toBe("Deine Bewerbung als Werkstudent:in");
    expect(renderMail("application_received", d).text).toContain("danke für Ihre Bewerbung");
    expect(renderMail("knockout_rejection", { ...d, tone: "du" }).text).not.toMatch(/\b(Sie|Ihre?n?)\b/);
  });
  it("keeps data requests formal", () => {
    expect(renderMail("data_request", { ...d, link: "https://x", tone: "du" }).subject).toBe("Ihre Daten bei recrewted");
  });
});

describe("assessment invitation", () => {
  it("contains the link and the time limit, in the employer's form of address", () => {
    const d = { firstName: "Mia", jobTitle: "Busfahrer:in", employer: "Hafermann Reisen", link: "https://recrewted.de/test/abc", minutes: 30 };
    const sie = renderMail("assessment_invite", d);
    expect(sie.text).toContain("https://recrewted.de/test/abc");
    expect(sie.text).toContain("30 Minuten");
    expect(renderMail("assessment_invite", { ...d, tone: "du" }).text).toContain("kannst du ihn machen");
    expect(renderMail("assessment_invite", { ...d, minutes: null }).text).toContain("kein Zeitlimit");
  });
});
