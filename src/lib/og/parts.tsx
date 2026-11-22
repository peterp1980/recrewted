// Building blocks for social preview images (next/og). Inline styles only; flexbox everywhere.

export const OG_SIZE = { width: 1200, height: 630 };
export const NIGHT = "#070b14";
export const TURQUOISE = "#1dc0d1";
export const PINK = "#ff437b";

export function Wordmark({ size = 44 }: { size?: number }) {
  return (
    <div style={{ display: "flex", fontSize: size, fontWeight: 800, letterSpacing: -1, color: "#fff" }}>
      re<span style={{ color: PINK, fontStyle: "italic" }}>crew</span>ted
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
        padding: "10px 22px",
        borderRadius: 999,
        fontSize: 28,
        fontWeight: strong ? 700 : 500,
        color: strong ? NIGHT : "rgba(255,255,255,0.92)",
        backgroundColor: strong ? TURQUOISE : "rgba(255,255,255,0.1)",
        border: strong ? "none" : "1px solid rgba(255,255,255,0.2)",
      }}
    >
      {children}
    </div>
  );
}
