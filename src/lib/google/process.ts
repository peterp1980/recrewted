import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { jobPath } from "@/lib/jobs/format";
import { googleOn } from "@/lib/feeds/settings";
import { siteUrl } from "@/lib/site";
import { indexingConfig, IndexingError, notifyGoogle } from "./indexing";

// Sends the indexing queue (0033). Without credentials nothing is claimed; entries wait.
// Only for the public site address (Google accepts URLs of verified properties only) and
// only for customers with Google for Jobs switched on.

export async function processIndexing(limit = 50, f: typeof fetch = fetch): Promise<{ sent: number; failed: number; skipped: number } | { skipped: string }> {
  const c = indexingConfig();
  if (!c) return { skipped: "Google-Zugang fehlt" };
  const base = siteUrl();
  if (!base.startsWith("https://") || base.includes(".vercel.app")) return { skipped: `keine öffentliche Adresse (${base})` };
  const admin = createAdminClient();
  const { data: claimed, error } = await admin.rpc("claim_indexing", { max_count: limit });
  if (error) throw new Error(`claim_indexing failed: ${error.message}`);
  const out = { sent: 0, failed: 0, skipped: 0 };
  for (const e of claimed ?? []) {
    const { data: v } = await admin.from("vacancies").select("id, title, location, organization_id").eq("id", e.vacancy_id).maybeSingle();
    const finish = (patch: Record<string, unknown>) => admin.from("indexing_outbox").update({ error: null, ...patch }).eq("id", e.id);
    if (!v) {
      await finish({ status: "skipped", error: "Vakanz gelöscht" });
      out.skipped++;
      continue;
    }
    // A job that is only updated is not reported while Google for Jobs is off for this customer.
    if (e.kind === "updated" && !(await googleOn(v.organization_id))) {
      await finish({ status: "skipped", error: "Google for Jobs für diesen Kunden aus" });
      out.skipped++;
      continue;
    }
    const url = `${base}${jobPath(v)}`;
    try {
      await notifyGoogle(url, e.kind as "updated" | "deleted", c, f);
      await finish({ status: "sent", url, sent_at: new Date().toISOString() });
      out.sent++;
    } catch (err) {
      const retry = err instanceof IndexingError ? err.retry : true;
      await finish({ status: retry && e.attempts < 5 ? "pending" : "failed", url, error: String(err instanceof Error ? err.message : err).slice(0, 300) });
      out.failed++;
    }
  }
  return out;
}
