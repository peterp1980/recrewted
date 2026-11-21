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
});
