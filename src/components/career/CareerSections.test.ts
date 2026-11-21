import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { newSection, sanitizeDocument, SECTION_TYPES } from "@/lib/careers/document";
import { CareerSections } from "./CareerSections";

const render = (doc: unknown, jobs = [{ id: "1", title: "Busfahrer:in (m/w/d)", href: "/jobs/x", location: "Witten", type: "Vollzeit", salary: "3.000 € pro Monat" }]) =>
  renderToStaticMarkup(createElement(CareerSections, { doc: sanitizeDocument(doc), name: "Hafermann Reisen", website: "https://example.org", color: "#e3051b", tone: "sie", jobs }));

describe("career page rendering", () => {
  it("renders every section type with content", () => {
    const html = render({
      logoUrl: "/logo.png",
      sections: [
        { id: "hero", type: "hero", data: { headline: "Familientradition", text: "Seit 1904", imageUrl: "/bus.jpg" } },
        { id: "facts", type: "facts", data: { items: [{ value: "1904", label: "gegründet" }] } },
        { id: "jobs", type: "jobs", data: { title: "Offene Stellen" } },
        { id: "benefits", type: "benefits", data: { title: "Benefits", items: [{ title: "Sicherheit", text: "Unbefristet" }] } },
        { id: "text", type: "text", data: { title: "Über uns", body: "Absatz 1\n\nAbsatz 2", imageUrl: "/team.jpg" } },
        { id: "team", type: "testimonials", data: { title: "Team", items: [{ name: "Angela", role: "Leitung", quote: "Schön hier", photo: "/a.jpg" }] } },
        { id: "gallery", type: "gallery", data: { title: "Einblicke", images: [{ url: "/g.jpg", alt: "Bus" }] } },
        { id: "video", type: "video", data: { title: "Interview", youtubeId: "https://youtu.be/dQw4w9WgXcQ" } },
        { id: "faq", type: "faq", data: { title: "FAQ", items: [{ q: "Wie?", a: "So." }] } },
        { id: "process", type: "process", data: { title: "Ablauf", steps: [{ title: "Bewerben", text: "" }] } },
        { id: "locations", type: "locations", data: { title: "Standorte", items: [{ name: "Witten", address: "Brüderstr. 7–9" }] } },
        { id: "contact", type: "contact", data: { office: "Unser Stammsitz", contact: "jobs@example.org" } },
      ],
    });
    for (const text of ["Familientradition", "1904", "Busfahrer:in (m/w/d)", "3.000 € pro Monat", "Sicherheit", "Absatz 2", "Schön hier", 'alt="Bus"', "Interview", "Wie?", "Bewerben", "Brüderstr. 7–9", "jobs@example.org", 'href="#jobs"']) {
      expect(html).toContain(text);
    }
    // Two-click video: no request to YouTube before the click.
    expect(html).not.toContain("youtube");
  });

  it("hides invisible sections and shows the empty state without jobs", () => {
    const html = render({ sections: [{ id: "hero", type: "hero", data: { headline: "X" } }, { id: "faq", type: "faq", visible: false, data: { items: [{ q: "Geheim?" }] } }, { id: "jobs", type: "jobs" }] }, []);
    expect(html).not.toContain("Geheim?");
    expect(html).toContain("Gerade ist keine Stelle ausgeschrieben");
    expect(html).not.toContain("offene Stelle");
  });

  it("renders the default of every type without crashing", () => {
    for (const t of SECTION_TYPES) expect(() => render({ sections: [newSection(t, t)] })).not.toThrow();
  });
});
