"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAccess } from "@/lib/auth/session";
import { parseProfileForm } from "@/lib/careers/profile";
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
