import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";
import { signProfileToken, verifyProfileToken } from "./token";

const secret = () => process.env.DATA_REQUEST_SECRET ?? null;

export const profileUrl = (candidateId: string): string | null => {
  const s = secret();
  return s ? `${siteUrl()}/profil/${signProfileToken(candidateId, s)}` : null;
};

export const candidateFromToken = (token: string): string | null => {
  const s = secret();
  return s ? verifyProfileToken(token, s) : null;
};

/** Marks the profile as wanted and queues the link (at most one per 10 minutes). */
export async function sendProfileLink(candidateId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: c } = await admin.from("candidates").select("first_name, email, profile_opt_in_at").eq("id", candidateId).maybeSingle();
  const link = profileUrl(candidateId);
  if (!c?.email || !link) return false;
  const { count } = await admin
    .from("mail_outbox")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidateId)
    .eq("template", "profile_link")
    .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString());
  if ((count ?? 0) > 0) return true;
  if (!c.profile_opt_in_at) await admin.from("candidates").update({ profile_opt_in_at: new Date().toISOString() }).eq("id", candidateId);
  const { error } = await admin.from("mail_outbox").insert({ candidate_id: candidateId, to_email: c.email, template: "profile_link", data: { firstName: c.first_name, jobTitle: "", link } });
  return !error;
}
