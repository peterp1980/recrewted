import { describe, expect, it } from "vitest";
import { embedCode, entryParam, imageUrl, isSlug, onColor, parseSettingsForm, toSlug } from "./profile";

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

describe("settings form", () => {
  it("needs a slug to publish, a valid colour, and reads the tone", () => {
    expect(parseSettingsForm(form({ enabled: "on" }))).toEqual({ ok: false, error: "slug" });
    expect(parseSettingsForm(form({ slug: "projx", brandColor: "teal" }))).toEqual({ ok: false, error: "color" });
    expect(parseSettingsForm(form({ slug: "Projx", enabled: "on", brandColor: "#4dc3cb", tone: "du" }))).toEqual({
      ok: true, value: { slug: "projx", enabled: true, brandColor: "#4dc3cb", tone: "du" },
    });
  });
});

describe("helpers", () => {
  it("accepts https and site paths only as images", () => {
    expect(imageUrl("https://x.supabase.co/a.jpg")).toBe("https://x.supabase.co/a.jpg");
    expect(imageUrl("/cases/gulp.png")).toBe("/cases/gulp.png");
    expect(imageUrl("javascript:alert(1)")).toBeNull();
    expect(imageUrl("http://x/a.jpg")).toBeNull();
    expect(imageUrl('https://x/a.jpg" onerror="x')).toBeNull();
  });
  it("picks a readable text colour", () => {
    expect(onColor("#0a7f8c")).toBe("#ffffff");
    expect(onColor("#ffd400")).toBe("#1f2328");
  });
  it("maps entry parameters", () => {
    expect(entryParam("widget")).toBe("widget");
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
