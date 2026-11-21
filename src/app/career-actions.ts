"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { isStaff } from "@/lib/auth/roles";
import { getSession, type Session } from "@/lib/auth/session";
import { sanitizeDocument } from "@/lib/careers/document";
import { CAREER_BUCKET } from "@/lib/careers/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Career page editor (migration 0014). Staff and the customer's own users edit the draft;
// RLS decides who sees which page, a trigger stops customers from publishing.

export type EditorResult = { ok: true; at: string } | { ok: false; error: "auth" | "forbidden" | "invalid" | "error" };
export type UploadResult = { ok: true; url: string } | { ok: false; error: "auth" | "forbidden" | "type" | "size" | "error" };

const isUuid = (v: string) => /^[0-9a-f-]{36}$/.test(v);

/** The page row is visible only to staff and members of the organization, so this doubles as the access check. */
async function access(orgId: string): Promise<{ session: Session; slug: string | null } | null> {
  const session = await getSession();
  if (!session || !isUuid(orgId)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("career_pages").select("organization_id, organizations(slug)").eq("organization_id", orgId).maybeSingle();
  if (!data) return null;
  return { session, slug: (data.organizations as unknown as { slug: string | null } | null)?.slug ?? null };
}

function refresh(orgId: string, slug: string | null) {
  revalidatePath(`/admin/organizations/${orgId}/karriereseite`);
  revalidatePath("/portal/karriereseite");
  if (slug) {
    revalidatePath(`/karriere/${slug}`);
    revalidatePath(`/widget/${slug}`);
  }
}

export async function saveCareerDraft(orgId: string, raw: unknown): Promise<EditorResult> {
  const a = await access(orgId);
  if (!a) return { ok: false, error: "auth" };
  const doc = sanitizeDocument(raw);
  const supabase = await createClient();
  const { error } = await supabase
    .from("career_pages")
    // Any change means: there is an unpublished draft again (and a submitted one must be sent again).
    .update({ draft: doc, status: "draft" })
    .eq("organization_id", orgId);
  if (error) return { ok: false, error: "error" };
  refresh(orgId, a.slug);
  return { ok: true, at: new Date().toISOString() };
}

/** Customers ask recrewted to publish their draft. */
export async function submitCareerPage(orgId: string): Promise<EditorResult> {
  const a = await access(orgId);
  if (!a) return { ok: false, error: "auth" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("career_pages")
    .update({ status: "in_review", submitted_at: new Date().toISOString(), submitted_by: a.session.userId })
    .eq("organization_id", orgId);
  if (error) return { ok: false, error: "error" };
  await audit(a.session.userId, "career_page_submitted", "career_pages", orgId);
  refresh(orgId, a.slug);
  return { ok: true, at: new Date().toISOString() };
}

/** Staff only: the draft becomes the public page. */
export async function publishCareerPage(orgId: string): Promise<EditorResult> {
  const a = await access(orgId);
  if (!a) return { ok: false, error: "auth" };
  if (!isStaff(a.session.role)) return { ok: false, error: "forbidden" };
  const supabase = await createClient();
  const { data: row } = await supabase.from("career_pages").select("draft").eq("organization_id", orgId).single();
  if (!row) return { ok: false, error: "error" };
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("career_pages")
    .update({ published: sanitizeDocument(row.draft), status: "published", published_at: now, published_by: a.session.userId })
    .eq("organization_id", orgId);
  if (error) return { ok: false, error: "error" };
  await audit(a.session.userId, "career_page_published", "career_pages", orgId);
  refresh(orgId, a.slug);
  return { ok: true, at: now };
}

/** Throws the draft away and starts again from the published page. */
export async function discardCareerDraft(orgId: string): Promise<EditorResult> {
  const a = await access(orgId);
  if (!a) return { ok: false, error: "auth" };
  const supabase = await createClient();
  const { data: row } = await supabase.from("career_pages").select("published").eq("organization_id", orgId).single();
  if (!row?.published) return { ok: false, error: "invalid" };
  const { error } = await supabase.from("career_pages").update({ draft: row.published, status: "published" }).eq("organization_id", orgId);
  if (error) return { ok: false, error: "error" };
  refresh(orgId, a.slug);
  return { ok: true, at: new Date().toISOString() };
}

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Picture for a career page (logo, header, team photo, gallery). Public bucket, one folder per
 * customer. Staff and the customer's own users may upload. Never for applicant files.
 */
export async function uploadCareerMedia(orgId: string, form: FormData): Promise<UploadResult> {
  const a = await access(orgId);
  if (!a) return { ok: false, error: "auth" };
  const file = form.get("file");
  if (!(file instanceof File) || !IMAGE_TYPES[file.type]) return { ok: false, error: "type" };
  if (file.size === 0 || file.size > MAX_BYTES) return { ok: false, error: "size" };
  const key = `${orgId}/${randomUUID()}.${IMAGE_TYPES[file.type]}`;
  const storage = createAdminClient().storage.from(CAREER_BUCKET);
  const { error } = await storage.upload(key, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) return { ok: false, error: "error" };
  await audit(a.session.userId, "career_image_uploaded", "career_pages", orgId, { key });
  return { ok: true, url: storage.getPublicUrl(key).data.publicUrl };
}
