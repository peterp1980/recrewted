import "server-only";
import { jobCards } from "@/lib/careers/cards";
import { sanitizeDocument, starterDocument } from "@/lib/careers/document";
import { CAREER_BUCKET } from "@/lib/careers/profile";
import { jobsOfOrganization } from "@/lib/jobs/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";

/** Everything the editor needs. Read through the user's session, so RLS decides access. */
export async function loadEditor(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_pages")
    .select("draft, published, status, organizations(name, website, slug, career_enabled, brand_color, candidate_tone)")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!data) return null;
  const org = data.organizations as unknown as { name: string; website: string | null; slug: string | null; career_enabled: boolean; brand_color: string | null; candidate_tone: string };
  const draft = sanitizeDocument(data.draft);

  const storage = createAdminClient().storage.from(CAREER_BUCKET);
  const { data: files } = await storage.list(orgId, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
  const uploaded = (files ?? []).filter((f) => f.id).map((f) => storage.getPublicUrl(`${orgId}/${f.name}`).data.publicUrl);
  // Images already used on the page (e.g. moved over from the old site) are offered too.
  const used = JSON.stringify(data.draft).match(/"(\/careers\/[^"]+|https:\/\/[^"]+\.(?:jpe?g|png|webp))"/g)?.map((s) => s.slice(1, -1)) ?? [];

  return {
    orgId,
    name: org.name,
    website: org.website,
    color: org.brand_color,
    tone: (org.candidate_tone === "du" ? "du" : "sie") as "sie" | "du",
    initialDoc: draft.sections.length ? draft : starterDocument(),
    initialStatus: data.status,
    hasPublished: data.published !== null,
    liveUrl: org.career_enabled && org.slug ? `${siteUrl()}/karriere/${org.slug}` : null,
    media: [...new Set([...uploaded, ...used])],
    jobs: jobCards(await jobsOfOrganization(orgId).catch(() => []), ""),
  };
}
