import { isOwnHost } from "./domain";

// Middleware helper: which career page belongs to a request's host? Looked up via the public
// RPC career_slug_for_host (0017) and cached per server instance, also for unknown hosts.

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { slug: string | null; until: number }>();

export async function careerSlugForHost(host: string | null): Promise<string | null> {
  if (!host) return null;
  const h = host.toLowerCase().replace(/:\d+$/, "");
  if (isOwnHost(h)) return null;
  const hit = cache.get(h);
  if (hit && hit.until > Date.now()) return hit.slug;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  let slug: string | null = null;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/career_slug_for_host`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ host: h }),
    });
    if (res.ok) slug = (await res.json()) as string | null;
  } catch {
    return null; // not cached: try again on the next request
  }
  if (cache.size > 500) cache.clear();
  cache.set(h, { slug: typeof slug === "string" ? slug : null, until: Date.now() + TTL_MS });
  return typeof slug === "string" ? slug : null;
}
