import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "recrewted",
    short_name: "recrewted",
    description: "Vorqualifizierte Kandidaten zum Festpreis.",
    start_url: "/",
    display: "browser",
    background_color: "#070b14",
    theme_color: "#070b14",
    lang: "de",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/brand/icon-512.png", type: "image/png", sizes: "512x512" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
