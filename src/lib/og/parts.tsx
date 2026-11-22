import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Building blocks for social preview images (next/og). Inline styles only; flexbox everywhere.
// Font: Plus Jakarta Sans (SIL Open Font License), the display font of the website, as static TTF.

const fontDir = join(process.cwd(), "src/lib/og/fonts");

export async function ogFonts() {
  const [medium, extraBold] = await Promise.all([
    readFile(join(fontDir, "PlusJakartaSans-Medium.ttf")),
    readFile(join(fontDir, "PlusJakartaSans-ExtraBold.ttf")),
  ]);
  return [
    { name: "Jakarta", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Jakarta", data: extraBold, weight: 800 as const, style: "normal" as const },
  ];
}

export const OG_SIZE = { width: 1200, height: 630 };
export const NIGHT = "#070b14";
export const TURQUOISE = "#1dc0d1";
export const PINK = "#ff437b";

export function Wordmark({ size = 44 }: { size?: number }) {
  return (
    <div style={{ display: "flex", fontSize: size, fontWeight: 800, letterSpacing: -1, color: "#fff" }}>
      re<span style={{ color: PINK }}>crew</span>ted
    </div>
  );
}

export function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 72,
        fontFamily: "Jakarta",
        fontWeight: 500,
        color: "#fff",
        backgroundColor: NIGHT,
        backgroundImage: `radial-gradient(circle at 12% 8%, rgba(29,192,209,0.35), transparent 45%), radial-gradient(circle at 95% 100%, rgba(255,67,123,0.28), transparent 45%)`,
      }}
    >
      {children}
    </div>
  );
}

export function Pill({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 24px",
        borderRadius: 999,
        fontSize: 24,
        whiteSpace: "nowrap",
        flexShrink: 0,
        fontWeight: strong ? 800 : 500,
        color: strong ? NIGHT : "rgba(255,255,255,0.92)",
        backgroundColor: strong ? TURQUOISE : "rgba(255,255,255,0.1)",
        border: strong ? "none" : "1px solid rgba(255,255,255,0.2)",
      }}
    >
      {children}
    </div>
  );
}
