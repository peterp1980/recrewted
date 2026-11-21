"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isStaff } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";

// Comments on an application. Written through the user's own session: RLS allows customers only
// on applications they can see and never internal notes; the database sets author and filters mentions.

export async function addComment(form: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const applicationId = String(form.get("applicationId") ?? "");
  if (!isUuid(applicationId)) redirect("/");
  const staff = isStaff(session.role);
  const page = (s: string) => `${staff ? "/admin" : "/portal"}/applications/${applicationId}?cm=${s}#kommentare`;
  const body = String(form.get("body") ?? "").trim();
  if (!body || body.length > 4000) redirect(page("invalid"));
  const raw = String(form.get("kind") ?? "comment");
  const kind = staff ? (raw === "internal" ? "internal" : "comment") : raw === "question" ? "question" : "comment";
  const mentions = [...new Set(form.getAll("mention").map(String).filter(isUuid))].slice(0, 20);
  const supabase = await createClient();
  const { error } = await supabase.from("application_comments").insert({ application_id: applicationId, author_id: session.userId, body, kind, mentions });
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath(`/portal/applications/${applicationId}`);
  redirect(page(error ? "error" : "saved"));
}
