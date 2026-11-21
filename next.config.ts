import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Career page images (admin upload, max 4 MB); Vercel itself stops at 4.5 MB per request.
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/career-media/**" }],
  },
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
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Nothing may be framed – except the job widget, which customers embed on their own sites.
      {
        source: "/((?!widget/).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      { source: "/widget/:path*", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }] },
    ];
  },
};

export default nextConfig;
