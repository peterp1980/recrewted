import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Everything public may be crawled, including by AI search (GEO). Personal links (appointments,
// survey, applicant profile), internal areas and embeds stay out.
const PRIVATE = ["/admin", "/portal", "/login", "/auth", "/api/", "/vorschau", "/widget/", "/termin/", "/umfrage/", "/profil/", "/test/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"], allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
