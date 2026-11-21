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

describe("profile and job alerts", () => {
  it("sends the profile link", () => {
    const m = renderMail("profile_link", { firstName: "Mia", jobTitle: "", link: "https://recrewted.de/profil/abc" });
    expect(m.subject).toBe("Ihr Bewerberprofil bei recrewted");
    expect(m.text).toContain("https://recrewted.de/profil/abc");
  });
  it("lists the jobs and links to the settings", () => {
    const m = renderMail("job_alert", { firstName: "Mia", jobTitle: "", link: "https://recrewted.de/profil/abc", jobs: [
      { title: "Busfahrer:in (m/w/d)", employer: "Hafermann Reisen", place: "Witten", url: "https://recrewted.de/jobs/x" },
      { title: "Kundenservice (m/w/d)", employer: null, place: null, url: "https://recrewted.de/jobs/y" },
    ] });
    expect(m.subject).toBe("2 neue Stellen, die zu Ihnen passen könnten");
    expect(m.text).toContain("Busfahrer:in (m/w/d) – Hafermann Reisen, Witten\nhttps://recrewted.de/jobs/x");
    expect(m.text).toContain("Kundenservice (m/w/d)\nhttps://recrewted.de/jobs/y");
    expect(m.text).toContain("https://recrewted.de/profil/abc");
  });
});

describe("status mails", () => {
  const d = { firstName: "Eva", jobTitle: "Busfahrer:in (m/w/d)", employer: "Hafermann Reisen" };
  it("has a text for every status, in both forms of address", () => {
    for (const status of ["pending", "shortlisted", "interview", "hired", "rejected"]) {
      const sie = renderMail("status_update", { ...d, status });
      const du = renderMail("status_update", { ...d, status, tone: "du" });
      expect(sie.subject).toContain("Busfahrer:in (m/w/d)");
      expect(sie.text).toMatch(/^Hallo Eva,\n\n/);
      expect(du.text).not.toMatch(/\b(Sie|Ihre?)\b/);
    }
    expect(renderMail("status_update", { ...d, status: "interview" }).text).toContain("Hafermann Reisen möchte Sie gern kennenlernen");
    expect(renderMail("status_update", { ...d, status: "unknown" }).subject).toContain("Zwischenstand");
  });
});

describe("weekly report mail", () => {
  it("lists the vacancies and links to the portal", () => {
    const m = renderMail("weekly_report", { firstName: "Peter", jobTitle: "", organization: "Hafermann Reisen", link: "https://recrewted.de/portal", lines: [{ title: "Busfahrer:in", text: "12 Bewerbungen · 5 passend" }] });
    expect(m.subject).toBe("Ihr Wochenbericht – Hafermann Reisen");
    expect(m.text).toContain("Busfahrer:in\n12 Bewerbungen · 5 passend");
    expect(m.text).toContain("https://recrewted.de/portal");
  });
});

describe("team mails (0023)", () => {
  it("links staff to the admin and customers to the portal, without header injection", () => {
    const base = { firstName: "Olaf", jobTitle: "Busfahrer", author: "Vera\nBcc: x@y.de", candidate: "Kai K.", excerpt: "Passt gut", applicationId: "a-1" };
    const c = renderMail("team_mention", base);
    expect(c.subject).not.toContain("\n");
    expect(c.text).toContain("/portal/applications/a-1#kommentare");
    expect(renderMail("team_mention", { ...base, staff: true, question: true }).subject).toBe("Rückfrage zu Kai K. (Busfahrer)");
    expect(renderMail("team_mention", { ...base, staff: true }).text).toContain("/admin/applications/a-1");
    expect(renderMail("team_shortlist", { firstName: "", jobTitle: "Busfahrer", vacancyId: "v-1" }).text).toContain("/portal/vacancies/v-1");
    expect(renderMail("vacancy_request", { firstName: "Rita", jobTitle: "Busfahrer", organization: "Hafermann", vacancyId: "v-1" }).subject).toBe("Neue Vakanz angefragt: Busfahrer (Hafermann)");
  });
});

describe("interview mails (0024)", () => {
  const d = { firstName: "Kai", jobTitle: "Busfahrer", employer: "Hafermann", startsAt: "2026-12-01T09:00:00Z", minutes: 45, mode: "onsite", location: "Landsberger Str. 72", link: "https://x/termin/t" };
  it("confirms date, place and link in the employer's tone", () => {
    const sie = renderMail("interview_booked", d);
    expect(sie.subject).toBe("Ihr Termin: Busfahrer bei Hafermann");
    expect(sie.text).toContain("Dienstag, 1. Dezember, 10:00 Uhr (45 Minuten, vor Ort)");
    expect(sie.text).toContain("Ort: Landsberger Str. 72");
    expect(sie.text).toContain("https://x/termin/t");
    expect(renderMail("interview_booked", { ...d, tone: "du", rebooked: true }).text).toContain("du hast umgebucht");
    expect(renderMail("interview_reminder", { ...d, mode: "phone" }).text).toContain("Wir rufen Sie unter Ihrer Nummer an.");
    expect(renderMail("booking_invite", { ...d, tone: "du" }).text).toContain("Such dir einfach einen passenden Termin aus");
  });
  it("tells the team who booked", () => {
    expect(renderMail("team_booking", { ...d, candidate: "Kai Kandidat", event: "cancelled", applicationId: "a1" }).subject).toBe("Kai Kandidat hat den Termin abgesagt: Busfahrer");
  });
});
