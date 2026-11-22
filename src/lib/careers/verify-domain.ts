import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { newNonce, proofMatches } from "./domain-proof";

const secret = () => process.env.DATA_REQUEST_SECRET ?? "";

/** True if https://<domain>/api/domain-check is answered by this deployment. */
export async function domainReachesUs(domain: string, f: typeof fetch = fetch): Promise<boolean> {
  if (!secret()) return false;
  const nonce = newNonce();
  try {
    const res = await f(`https://${domain}/api/domain-check?nonce=${encodeURIComponent(nonce)}`, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return false;
    const body = (await res.json().catch(() => ({}))) as { proof?: unknown };
    return proofMatches(domain, nonce, body.proof, secret());
  } catch {
    return false; // DNS missing, certificate not ready, timeout
  }
}

/**
 * Re-checks one organisation's domain and stores the result: verified_at is set on success and
 * cleared when the domain stops reaching us. Returns whether the domain is verified now.
 */
export async function syncDomainVerification(organizationId: string, domain: string): Promise<boolean> {
  const ok = await domainReachesUs(domain);
  const admin = createAdminClient();
  const { data } = await admin.from("organizations").select("career_domain, career_domain_verified_at").eq("id", organizationId).maybeSingle();
  if (!data || data.career_domain !== domain) return false;
  if (ok && !data.career_domain_verified_at) {
    await admin.from("organizations").update({ career_domain_verified_at: new Date().toISOString() }).eq("id", organizationId).eq("career_domain", domain);
  } else if (!ok && data.career_domain_verified_at) {
    await admin.from("organizations").update({ career_domain_verified_at: null }).eq("id", organizationId);
  }
  return ok;
}

/** Daily: all customer domains. */
export async function syncAllDomains(): Promise<{ checked: number; verified: number }> {
  const { data } = await createAdminClient().from("organizations").select("id, career_domain").not("career_domain", "is", null);
  let verified = 0;
  for (const o of data ?? []) {
    if (o.career_domain && (await syncDomainVerification(o.id, o.career_domain))) verified++;
  }
  return { checked: data?.length ?? 0, verified };
}
