import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      // Old job subdomain (F21): everything goes to the new job board.
      { source: "/:path*", has: [{ type: "host", value: "jobs.recrewted.de" }], destination: "https://recrewted.de/jobs", permanent: true },
      // Old pages – extend this list with the URLs from the old site's sitemap before go-live.
      { source: "/stellenangebote", destination: "/jobs", permanent: true },
      { source: "/karriere", destination: "/jobs", permanent: true },
      { source: "/kontaktformular", destination: "/kontakt", permanent: true },
      { source: "/leistung", destination: "/leistungen", permanent: true },
      { source: "/preise", destination: "/pakete", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
