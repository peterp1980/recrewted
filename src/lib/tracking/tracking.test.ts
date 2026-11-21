import { describe, expect, it } from "vitest";
import { fromUrl, merge, parseAttribution } from "./attribution";
import { BANNER_VERSION, parseConsent, serializeConsent } from "./consent";

const ID = "3f2b1c4d-1234-4abc-8def-0123456789ab";

describe("consent cookie", () => {
  it("round-trips and rejects outdated versions", () => {
    const c = { version: BANNER_VERSION, statistics: true, marketing: false, visitorId: ID };
    expect(parseConsent(serializeConsent(c))).toEqual(c);
    expect(parseConsent(`2020-01-01.1.1.${ID}`)).toBeNull();
    expect(parseConsent("garbage")).toBeNull();
  });
  it("marketing implies statistics", () => {
    expect(parseConsent(`${BANNER_VERSION}.0.1.${ID}`)).toMatchObject({ statistics: true, marketing: true });
  });
});

describe("attribution", () => {
  it("reads UTM and click IDs and marks paid traffic", () => {
    expect(fromUrl("?utm_source=meta&utm_medium=paid_social&utm_campaign=job-1&fbclid=IwAR123abc", 1)).toEqual({
      utm_source: "meta", utm_medium: "paid_social", utm_campaign: "job-1", utm_content: undefined, click_id_type: "fbclid", click_id: "IwAR123abc", paid: true, at: 1,
    });
    expect(fromUrl("?utm_source=newsletter&utm_medium=email")?.paid).toBe(false);
    expect(fromUrl("?q=elektroniker")).toBeNull();
  });

  it("keeps the last paid click over a later organic visit, within 90 days", () => {
    const paid = fromUrl("?gclid=abc12345", 0)!;
    const organic = fromUrl("?utm_source=newsletter", 1000)!;
    expect(merge(paid, organic, 1000)).toBe(paid);
    expect(merge(paid, organic, 91 * 86_400_000)).toBe(organic);
    const paid2 = fromUrl("?utm_source=tiktok&ttclid=xyz98765", 2000)!;
    expect(merge(paid, paid2, 2000)).toBe(paid2);
  });

  it("rejects malformed click IDs and cookies", () => {
    expect(fromUrl("?gclid=<script>")).toBeNull();
    expect(parseAttribution("{not json")).toBeNull();
  });
});
