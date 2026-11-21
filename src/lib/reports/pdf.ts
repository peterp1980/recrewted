import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toWinAnsi } from "@/lib/scorecard/pdf";
import { vacancyLine, type WeeklyReport } from "./weekly";

const STATUS: Record<string, string> = { active: "läuft", paused: "pausiert", filled: "besetzt" };

/** Weekly report as a one-to-few page PDF. */
export async function weeklyReportPdf(r: WeeklyReport): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(toWinAnsi(`Wochenbericht ${r.organization}`));
  doc.setProducer("recrewted");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const [W, H, M] = [595.28, 841.89, 56];
  let page = doc.addPage([W, H]);
  let y = H - M;
  const line = (s: string, size = 10.5, f = font, color: [number, number, number] = [0.1, 0.1, 0.1]) => {
    // simple wrap
    const words = toWinAnsi(s).split(/\s+/);
    let cur = "";
    const flush = () => {
      if (y - size * 1.4 < M) { page = doc.addPage([W, H]); y = H - M; }
      page.drawText(cur, { x: M, y: y - size, size, font: f, color: rgb(...color) });
      y -= size * 1.4;
      cur = "";
    };
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(next, size) > W - 2 * M && cur) { flush(); cur = w; } else cur = next;
    }
    if (cur) flush();
  };
  line("recrewted · Wochenbericht", 9, font, [0.4, 0.4, 0.4]);
  y -= 4;
  line(r.organization, 20, bold);
  line(`${r.from} – ${r.to}`, 11, font, [0.35, 0.35, 0.35]);
  y -= 12;
  if (r.vacancies.length === 0) line("Zurzeit keine laufenden Stellen.");
  for (const v of r.vacancies) {
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    y -= 10;
    line(`${v.title} (${STATUS[v.status] ?? v.status})`, 12, bold);
    line(vacancyLine(v).replace(/ /g, " "));
    y -= 8;
  }
  y -= 6;
  line("Passend = hat die Vorauswahl bestanden. Vorgestellt = steht auf der Shortlist mit Bewertungsbogen.", 8.5, font, [0.45, 0.45, 0.45]);
  return doc.save();
}
