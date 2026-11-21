import { describe, expect, it } from "vitest";
import { benefitsFromStored, benefitsToText, embedCode, entryParam, isSlug, onColor, parseBenefits, parseProfileForm, toSlug } from "./profile";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe("slugs", () => {
  it("derives URL-safe short names", () => {
    expect(toSlug("projx GmbH")).toBe("projx-gmbh");
    expect(toSlug("Müller & Söhne Bäckerei")).toBe("mueller-soehne-baeckerei");
    expect(toSlug("  --Café Ölberg--  ")).toBe("cafe-oelberg");
  });
  it("validates", () => {
    expect(isSlug("projx")).toBe(true);
    expect(isSlug("a")).toBe(true);
    expect(isSlug("-projx")).toBe(false);
    expect(isSlug("projx-")).toBe(false);
    expect(isSlug("Projx")).toBe(false);
  });
});

describe("benefits", () => {
  it("parses one per line with optional text and round-trips", () => {
    const b = parseBenefits("- Urban Sports Club: Zuschuss zur Mitgliedschaft\nWeiterbildung\n\n");
    expect(b).toEqual([{ title: "Urban Sports Club", text: "Zuschuss zur Mitgliedschaft" }, { title: "Weiterbildung", text: "" }]);
    expect(parseBenefits(benefitsToText(b))).toEqual(b);
  });
  it("reads stored data defensively", () => {
    expect(benefitsFromStored(null)).toEqual([]);
    expect(benefitsFromStored([{ title: "A", text: 1 }, "x", { text: "no title" }])).toEqual([{ title: "A", text: "" }]);
  });
});

describe("profile form", () => {
  it("needs a slug to publish and a valid colour", () => {
    expect(parseProfileForm(form({ enabled: "on" }))).toEqual({ ok: false, error: "slug" });
    expect(parseProfileForm(form({ slug: "projx", brandColor: "teal" }))).toEqual({ ok: false, error: "color" });
    const r = parseProfileForm(form({ slug: "Projx", enabled: "on", headline: " Karriere ", brandColor: "#4dc3cb" }));
    expect(r).toMatchObject({ ok: true, value: { slug: "projx", enabled: true, headline: "Karriere", brandColor: "#4dc3cb" } });
  });
});

describe("helpers", () => {
  it("picks a readable text colour", () => {
    expect(onColor("#0a7f8c")).toBe("#ffffff");
    expect(onColor("#ffd400")).toBe("#1f2328");
  });
  it("maps entry parameters", () => {
    expect(entryParam("widget")).toBe("widget");
    expect(entryParam("karriereseite")).toBe("karriereseite");
    expect(entryParam("toString")).toBeNull();
    expect(entryParam(undefined)).toBeNull();
  });
  it("builds embed code that only accepts messages from our origin", () => {
    const code = embedCode("https://recrewted.de", "projx", 'A "B"');
    expect(code).toContain('src="https://recrewted.de/widget/projx"');
    expect(code).toContain('e.origin!=="https://recrewted.de"');
    expect(code).toContain("A &quot;B&quot;");
  });
});
