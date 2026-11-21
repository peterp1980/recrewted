import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { scorecardPdf, toWinAnsi } from "./pdf";

describe("scorecard PDF", () => {
  it("keeps German characters and replaces others", () => {
    expect(toWinAnsi("Jürgen Größe – „gut“ €")).toBe("Jürgen Größe – „gut“ €");
    expect(toWinAnsi("Şükrü Çelik")).toBe("Sükrü Çelik"); // Ş is not in WinAnsi, Ç is
    expect(toWinAnsi("Test 🙂")).toBe("Test ?");
  });

  it("renders a multi-page PDF without failing on long texts and unusual names", async () => {
    const bytes = await scorecardPdf({
      applicationId: "x",
      candidateName: "Şükrü Çelik",
      vacancyTitle: "Elektroniker (m/w/d)",
      employer: "Müller & Söhne GmbH",
      status: "shortlisted",
      score: 4.33,
      criteria: Array.from({ length: 12 }, (_, i) => ({
        id: String(i), name: `Kriterium ${i}`, description: null, weight: 1 + (i % 3),
        rating: i % 6 === 5 ? null : 1 + (i % 5), reason: "Sehr ausführliche Begründung ".repeat(12), ratedAt: null, aiAssisted: false,
      })),
    }, new Date("2026-11-21T10:00:00Z"));
    expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(doc.getTitle()).toBe("Bewertungsbogen – Sükrü Çelik");
  });
});
