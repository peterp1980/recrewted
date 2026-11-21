import { describe, expect, it } from "vitest";
import { MAX_SECTIONS, newSection, sanitizeDocument, SECTION_TYPES, starterDocument, youtubeId } from "./document";

describe("career document", () => {
  it("drops unknown sections, duplicate IDs and unsafe links", () => {
    const d = sanitizeDocument({
      logoUrl: "javascript:x",
      sections: [
        { id: "hero", type: "hero", data: { headline: "  Hallo  ", imageUrl: "https://x/a.jpg" } },
        { id: "hero", type: "text", data: { title: "Doppelt" } },
        { id: "evil", type: "script", data: {} },
        { id: "g", type: "gallery", visible: false, data: { images: [{ url: "data:image/png;base64,xx" }, { url: "/a.jpg", alt: "A" }] } },
      ],
    });
    expect(d.logoUrl).toBeNull();
    expect(d.sections.map((s) => s.id)).toEqual(["hero", "g"]);
    expect(d.sections[0].data).toEqual({ headline: "Hallo", text: "", imageUrl: "https://x/a.jpg" });
    expect(d.sections[1]).toMatchObject({ visible: false, data: { images: [{ url: "/a.jpg", alt: "A" }] } });
  });

  it("tolerates garbage", () => {
    expect(sanitizeDocument(null)).toEqual({ v: 1, logoUrl: null, sections: [] });
    expect(sanitizeDocument({ sections: "x" }).sections).toEqual([]);
    expect(sanitizeDocument({ sections: Array.from({ length: 30 }, (_, i) => ({ id: `t${i}`, type: "text" })) }).sections).toHaveLength(MAX_SECTIONS);
  });

  it("caps texts and item counts", () => {
    const d = sanitizeDocument({ sections: [{ id: "f", type: "facts", data: { items: Array.from({ length: 9 }, () => ({ value: "1".repeat(50), label: "x" })) } }] });
    const facts = d.sections[0].data as { items: { value: string }[] };
    expect(facts.items).toHaveLength(4);
    expect(facts.items[0].value).toHaveLength(20);
  });

  it("reads YouTube links and IDs", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://evil.example/watch?v=dQw4w9WgXcQ")).toBe("");
  });

  it("has defaults for every type that survive sanitizing", () => {
    for (const t of SECTION_TYPES) expect(sanitizeDocument({ sections: [newSection(t, t)] }).sections[0].type).toBe(t);
    expect(starterDocument().sections.map((s) => s.type)).toEqual(["hero", "jobs", "benefits", "contact"]);
  });
});
