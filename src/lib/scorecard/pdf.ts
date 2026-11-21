import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { RATING_LABELS, scoreText } from "./ratings";
import type { ScorecardData } from "./load";

// Scorecard as PDF (F4). Standard Helvetica covers German (WinAnsi); other
// characters are replaced so the export never fails on an unusual name.

const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
export function toWinAnsi(text: string): string {
  return Array.from(text.normalize("NFC"))
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      if (ch === "\n") return ch;
      if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.includes(ch)) return ch;
      const base = ch.normalize("NFKD").replace(/[̀-ͯ]/g, "");
      return /^[\x20-\x7e]+$/.test(base) ? base : "?";
    })
    .join("");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" });

export async function scorecardPdf(data: ScorecardData, now = new Date()): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(toWinAnsi(`Bewertungsbogen – ${data.candidateName}`));
  doc.setProducer("recrewted");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 56;
  const width = 595.28 - margin * 2;
  let page: PDFPage = doc.addPage([595.28, 841.89]);
  let y = 841.89 - margin;

  const ensure = (h: number) => {
    if (y - h < margin) {
      page = doc.addPage([595.28, 841.89]);
      y = 841.89 - margin;
    }
  };
  const text = (s: string, opts: { size?: number; f?: PDFFont; color?: [number, number, number]; gap?: number } = {}) => {
    const size = opts.size ?? 10.5;
    const f = opts.f ?? font;
    for (const line of wrap(toWinAnsi(s), f, size, width)) {
      ensure(size * 1.4);
      page.drawText(line, { x: margin, y: y - size, size, font: f, color: rgb(...(opts.color ?? [0.1, 0.1, 0.1])) });
      y -= size * 1.4;
    }
    y -= opts.gap ?? 0;
  };

  text("recrewted · Bewertungsbogen", { size: 9, color: [0.4, 0.4, 0.4], gap: 6 });
  text(data.candidateName, { size: 20, f: bold, gap: 2 });
  text([data.vacancyTitle, data.employer].filter(Boolean).join(" · "), { size: 12, gap: 10 });
  text(`Gesamt: ${scoreText(data.score)}  (gewichteter Mittelwert, 1 = erfüllt nicht, 5 = voll und ganz)`, { size: 12, f: bold, gap: 14 });

  for (const c of data.criteria) {
    ensure(60);
    page.drawLine({ start: { x: margin, y }, end: { x: margin + width, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    y -= 8;
    text(`${c.name}  (Gewicht ${c.weight})`, { f: bold, size: 11 });
    text(c.rating ? `${c.rating} von 5 – ${RATING_LABELS[c.rating]}` : "nicht bewertet", { color: c.rating ? [0.1, 0.1, 0.1] : [0.45, 0.45, 0.45] });
    if (c.reason) text(c.reason, { color: [0.25, 0.25, 0.25] });
    y -= 8;
  }

  y -= 10;
  text(`Erstellt am ${dateFmt.format(now)}. Bewertet von Recruitern bei recrewted; jede Bewertung ist begründet.`, { size: 8.5, color: [0.45, 0.45, 0.45] });
  text("Vertraulich – enthält personenbezogene Daten. Nur für das Auswahlverfahren verwenden und danach löschen.", { size: 8.5, color: [0.45, 0.45, 0.45] });
  return doc.save();
}
