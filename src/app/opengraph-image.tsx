import { ImageResponse } from "next/og";

export const alt = "recrewted – vorqualifizierte Kandidaten zum Festpreis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social preview (LinkedIn, WhatsApp, Slack). Rendered at build time. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 80, background: "#f6f5f3", color: "#1f2328" }}>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
          re<span style={{ color: "#ff437b" }}>crew</span>ted
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>
          <span>Vorqualifizierte Kandidaten.</span>
          <span style={{ color: "#ff437b" }}>Zum Festpreis.</span>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#5c6166" }}>Shortlist mit Bewertungsbogen · Werbebudget inklusive</div>
      </div>
    ),
    size,
  );
}
