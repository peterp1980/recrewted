"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAccess } from "@/lib/auth/session";
import { parseSettingsForm } from "@/lib/careers/profile";
import { addDomain, removeDomain } from "@/lib/careers/vercel";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

/** Admin only: settings of the career page (address, published flag, colour, form of address). Content lives in the editor. */
export async function saveCareerSettings(form: FormData) {
  const id = String(form.get("organizationId") ?? "");
  const path = `/admin/organizations/${id}`;
  const session = await requireAccess(path);
  if (session.role !== "admin") redirect(`${path}?error=forbidden`);

  const parsed = parseSettingsForm(form);
  if (!parsed.ok) redirect(`${path}?error=${parsed.error}`);
  const p = parsed.value;

  const supabase = await createClient();
  const { data: before } = await supabase.from("organizations").select("career_domain").eq("id", id).maybeSingle();
  const { data, error } = await supabase
    .from("organizations")
    .update({ slug: p.slug, career_enabled: p.enabled, brand_color: p.brandColor, candidate_tone: p.tone, career_domain: p.domain })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error?.code === "23505") redirect(`${path}?error=${error.message.includes("career_domain") ? "domainTaken" : "slug"}`);
  if (error || !data) redirect(`${path}?error=error`);

  // Register a new domain with the hosting (if the Vercel API is configured); drop the old one.
  const old = before?.career_domain ?? null;
  if (old !== p.domain) {
    if (old) await removeDomain(old);
    if (p.domain) await addDomain(p.domain);
  }
  await audit(session.userId, "career_settings_saved", "organizations", id, { slug: p.slug, enabled: p.enabled, tone: p.tone, domain: p.domain });
  revalidatePath(path);
  if (data.slug) {
    revalidatePath(`/karriere/${data.slug}`);
    revalidatePath(`/widget/${data.slug}`);
  }
  redirect(`${path}?status=saved`);
}

/** Admin only: a new customer. RLS allows inserts for admins only. */
export async function createOrganization(form: FormData) {
  const session = await requireAccess("/admin/organizations");
  if (session.role !== "admin") redirect("/admin/organizations?error=forbidden");
  const name = String(form.get("name") ?? "").trim().slice(0, 150);
  const websiteRaw = String(form.get("website") ?? "").trim().slice(0, 300);
  const website = websiteRaw ? (/^https?:\/\//.test(websiteRaw) ? websiteRaw : `https://${websiteRaw}`) : null;
  if (name.length < 2 || (website && !/^https?:\/\/[^\s/]+\.[^\s]+$/.test(website))) redirect("/admin/organizations?error=invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.from("organizations").insert({ name, website }).select("id").single();
  if (error || !data) redirect("/admin/organizations?error=error");
  await audit(session.userId, "organization_created", "organizations", data.id, { name });
  revalidatePath("/admin/organizations");
  redirect(`/admin/organizations/${data.id}?status=created`);
}
