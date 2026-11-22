import { ImageResponse } from "next/og";
import { Backdrop, Label, OG_SIZE, ogFonts, Pill, PINK, Stamp, Wordmark } from "@/lib/og/parts";

export const alt = "recrewted – vorqualifizierte Kandidaten zum Festpreis";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Social preview of the website (LinkedIn, WhatsApp, Slack). */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <Backdrop>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Wordmark />
          <Label>Recruiting zum Festpreis</Label>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontFamily: "Serif", fontWeight: 600, fontSize: 84, lineHeight: 0.98, letterSpacing: -3 }}>
          <span>Vorqualifizierte Kandidaten.</span>
          <span style={{ fontStyle: "italic", fontWeight: 500, color: PINK }}>Zum Festpreis.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12 }}>
            <Pill strong>Shortlist mit Bewertungsbogen</Pill>
            <Pill>Werbebudget inklusive</Pill>
          </div>
          <Stamp>Geprüft</Stamp>
        </div>
      </Backdrop>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
