import { describe, expect, it } from "vitest";
import { checkCv, MAX_CV_BYTES, normalizePhone, parseApplication } from "./parse";

const form = (f: Record<string, string>) => {
  const d = new FormData();
  for (const [k, v] of Object.entries(f)) d.set(k, v);
  return d;
};

describe("parseApplication", () => {
  it("accepts name plus e-mail or phone and consent", () => {
    const r = parseApplication(form({ firstName: "Eva", lastName: "Muster", email: "Eva@Example.org", processingConsent: "on" }));
    expect(r.errors).toEqual([]);
    expect(r.value).toMatchObject({ email: "eva@example.org", phone: null, talentPoolConsent: false });
    expect(parseApplication(form({ firstName: "Eva", lastName: "Muster", phone: "0171 234 56 78", processingConsent: "on" })).value.phone).toBe("01712345678");
  });

  it("needs a way to reach the applicant and consent", () => {
    expect(parseApplication(form({ firstName: "Eva", lastName: "Muster" })).errors).toEqual(["contact", "consent"]);
  });

  it("reports invalid contact details", () => {
    expect(parseApplication(form({ firstName: "Eva", lastName: "M", email: "eva@", phone: "123", processingConsent: "on" })).errors).toEqual(["email", "phone"]);
  });

  it("keeps the talent pool consent separate and optional", () => {
    const r = parseApplication(form({ firstName: "E", lastName: "M", email: "e@m.de", processingConsent: "on", talentPoolConsent: "on" }));
    expect(r.value.talentPoolConsent).toBe(true);
  });

  it("normalizes phone numbers", () => {
    expect(normalizePhone("+49 (171) 234-5678")).toBe("+491712345678");
    expect(normalizePhone("abc")).toBeNull();
  });
});

describe("checkCv", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(20).fill(0)]);
  it("recognizes PDF and images by content", () => {
    expect(checkCv(bytes(0x25, 0x50, 0x44, 0x46))).toMatchObject({ ok: true, ext: "pdf" });
    expect(checkCv(bytes(0xff, 0xd8, 0xff))).toMatchObject({ ok: true, ext: "jpg" });
    expect(checkCv(bytes(0x89, 0x50, 0x4e, 0x47))).toMatchObject({ ok: true, ext: "png" });
  });

  it("accepts DOCX but not other ZIP files", () => {
    const docx = new TextEncoder().encode("PK\u0003\u0004....[Content_Types].xml word/document.xml");
    expect(checkCv(docx)).toMatchObject({ ok: true, ext: "docx" });
    expect(checkCv(new TextEncoder().encode("PK\u0003\u0004....evil.exe"))).toEqual({ ok: false, error: "type" });
  });

  it("rejects executables, empty and oversized files", () => {
    expect(checkCv(bytes(0x4d, 0x5a))).toEqual({ ok: false, error: "type" });
    expect(checkCv(new Uint8Array())).toEqual({ ok: false, error: "size" });
    expect(checkCv(new Uint8Array(MAX_CV_BYTES + 1))).toEqual({ ok: false, error: "size" });
  });
});
