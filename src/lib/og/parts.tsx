import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Building blocks for social preview images (next/og), in the site's "personnel file" style:
// paper, ink, serif headlines, mono labels, a stamp. Fonts (SIL OFL): Fraunces, Schibsted Grotesk, IBM Plex Mono.

const fontDir = join(process.cwd(), "src/lib/og/fonts");

export async function ogFonts() {
  const [serif, serifItalic, sans, mono] = await Promise.all(
    ["Fraunces-SemiBold.ttf", "Fraunces-MediumItalic.ttf", "SchibstedGrotesk-Medium.ttf", "IBMPlexMono-SemiBold.ttf"].map((f) => readFile(join(fontDir, f))),
  );
  return [
    { name: "Serif", data: serif, weight: 600 as const, style: "normal" as const },
    { name: "Serif", data: serifItalic, weight: 500 as const, style: "italic" as const },
    { name: "Sans", data: sans, weight: 500 as const, style: "normal" as const },
    { name: "Mono", data: mono, weight: 600 as const, style: "normal" as const },
  ];
}

export const OG_SIZE = { width: 1200, height: 630 };
export const INK = "#141311";
export const PAPER = "#fbf9f4";
export const CANVAS = "#f2eee4";
export const PINK = "#ff437b";
export const PINK_DARK = "#c8144b";
export const MARKER = "#ffe14d";

export function Wordmark({ size = 40 }: { size?: number }) {
  return (
    <div style={{ display: "flex", fontFamily: "Serif", fontWeight: 600, fontSize: size, letterSpacing: -1, color: INK }}>
      re<span style={{ color: PINK, fontStyle: "italic", fontWeight: 500 }}>crew</span>ted
    </div>
  );
}

/** Paper with a hard ink frame and a red margin line. */
export function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", padding: 36, backgroundColor: CANVAS, fontFamily: "Sans", color: INK }}>
      <div
        style={{
          display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%",
          padding: "44px 56px 44px 96px", backgroundColor: PAPER, border: `4px solid ${INK}`, boxShadow: `14px 14px 0 ${INK}`, position: "relative",
        }}
      >
        <div style={{ position: "absolute", left: 64, top: 0, bottom: 0, width: 2, backgroundColor: "rgba(255,67,123,0.55)" }} />
        {children}
      </div>
    </div>
  );
}

export function Label({ children, color = "#5a554c" }: { children: React.ReactNode; color?: string }) {
  return <div style={{ display: "flex", fontFamily: "Mono", fontWeight: 600, fontSize: 20, letterSpacing: 4, textTransform: "uppercase", color }}>{children}</div>;
}

export function Pill({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", padding: "7px 14px", fontFamily: "Mono", fontWeight: 600, fontSize: 20, letterSpacing: 1,
        textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0, border: `3px solid ${INK}`, backgroundColor: strong ? MARKER : PAPER, color: INK,
      }}
    >
      {children}
    </div>
  );
}

export function Stamp({ children }: { children: React.ReactNode }) {
  // Satori has no "double" border: two nested frames instead.
  return (
    <div style={{ display: "flex", transform: "rotate(-7deg)", padding: 3, border: `3px solid ${PINK_DARK}` }}>
      <div style={{ display: "flex", padding: "6px 16px", border: `2px solid ${PINK_DARK}`, color: PINK_DARK, fontFamily: "Mono", fontWeight: 600, fontSize: 26, letterSpacing: 6, textTransform: "uppercase" }}>
        {children}
      </div>
    </div>
  );
}
