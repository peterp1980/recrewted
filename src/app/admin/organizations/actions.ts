"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAccess } from "@/lib/auth/session";
import { CAREER_BUCKET, parseProfileForm } from "@/lib/careers/profile";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

/** Saves a customer's career page profile. RLS allows this for admins only. */
export async function saveCareerProfile(form: FormData) {
  const id = String(form.get("organizationId") ?? "");
  const path = `/admin/organizations/${id}`;
  const session = await requireAccess(path);
  if (session.role !== "admin") redirect(`${path}?error=forbidden`);

  const parsed = parseProfileForm(form);
  if (!parsed.ok) redirect(`${path}?error=${parsed.error}`);
  const p = parsed.value;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      slug: p.slug,
      career_enabled: p.enabled,
      career_headline: p.headline || null,
      career_intro: p.intro || null,
      career_benefits: p.benefits,
      career_office: p.office || null,
      career_contact: p.contact || null,
      brand_color: p.brandColor,
      candidate_tone: p.tone,
      career_logo_url: p.logoUrl,
      career_hero_url: p.heroUrl,
      career_facts: p.facts,
      career_testimonials: p.testimonials,
    })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error?.code === "23505") redirect(`${path}?error=slug`);
  if (error || !data) redirect(`${path}?error=error`);

  await audit(session.userId, "career_profile_saved", "organizations", id, { slug: p.slug, enabled: p.enabled });
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

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };


/**
 * Admin only: uploads a picture for a career page (logo, header, team photo)
 * to the public bucket, in a folder per customer. Never for applicant files.
 */
export async function uploadCareerImage(form: FormData) {
  const id = String(form.get("organizationId") ?? "");
  const path = `/admin/organizations/${id}`;
  const session = await requireAccess(path);
  if (session.role !== "admin") redirect(`${path}?error=forbidden`);
  if (!/^[0-9a-f-]{36}$/.test(id)) redirect("/admin/organizations");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 4 * 1024 * 1024 || !IMAGE_TYPES[file.type]) redirect(`${path}?error=upload#bilder`);
  const key = `${id}/${randomUUID()}.${IMAGE_TYPES[file.type]}`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from(CAREER_BUCKET).upload(key, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) redirect(`${path}?error=upload#bilder`);
  await audit(session.userId, "career_image_uploaded", "organizations", id, { key });
  redirect(`${path}?status=uploaded#bilder`);
}
