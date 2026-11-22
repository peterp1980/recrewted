import { ImageResponse } from "next/og";
import { ogFonts, Backdrop, OG_SIZE, Pill, TURQUOISE, PINK, Wordmark } from "@/lib/og/parts";

export const alt = "recrewted – vorqualifizierte Kandidaten zum Festpreis";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Social preview of the website (LinkedIn, WhatsApp, Slack). */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <Backdrop>
        <Wordmark />
        <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2.5 }}>
          <span>Vorqualifizierte Kandidaten.</span>
          <span style={{ color: TURQUOISE }}>
            Zum <span style={{ color: PINK, marginLeft: 22 }}>Festpreis.</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Pill>Shortlist mit Bewertungsbogen</Pill>
          <Pill>Werbebudget inklusive</Pill>
          <Pill>Daten in Frankfurt</Pill>
        </div>
      </Backdrop>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
