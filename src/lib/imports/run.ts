import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toBriefing, type ImportedJob } from "./normalize";
import { fetchJobs, ImportError, isImportProvider } from "./providers";

// One import run for one source: new jobs become draft vacancies with a pre-filled briefing (a recruiter
// checks and releases them), known jobs are refreshed, jobs that disappeared at the source are marked.
// Live vacancies are never changed by an import.

const MAX_NEW_PER_RUN = 50;

export async function featureOn(key: "import_customer_jobs" | "external_jobs"): Promise<boolean> {
  const { data } = await createAdminClient().from("feature_switches").select("enabled").eq("key", key).maybeSingle();
  return Boolean(data?.enabled);
}

export type RunResult = { found: number; created: number; updated: number; gone: number; error?: string };

export async function runImport(importId: string, actorId: string | null, f: typeof fetch = fetch): Promise<RunResult> {
  const admin = createAdminClient();
  const { data: imp } = await admin.from("job_imports").select("id, organization_id, provider, source, enabled").eq("id", importId).single();
  if (!imp || !isImportProvider(imp.provider)) return { found: 0, created: 0, updated: 0, gone: 0, error: "Quelle nicht gefunden." };
  const save = async (r: RunResult) => {
    await admin.from("job_imports").update({ last_run_at: new Date().toISOString(), last_result: r }).eq("id", imp.id);
    return r;
  };
  if (!(await featureOn("import_customer_jobs"))) return save({ found: 0, created: 0, updated: 0, gone: 0, error: "Import ist im Admin für alle ausgeschaltet." });

  let jobs: ImportedJob[];
  try {
    jobs = (await fetchJobs(imp.provider, imp.source, f)).filter((j) => j.externalId && j.title).slice(0, 200);
  } catch (e) {
    return save({ found: 0, created: 0, updated: 0, gone: 0, error: e instanceof ImportError ? e.message : "Import fehlgeschlagen." });
  }

  const { data: known } = await admin.from("imported_jobs").select("id, external_id, gone_at").eq("import_id", imp.id);
  const byId = new Map((known ?? []).map((k) => [k.external_id, k]));
  const now = new Date().toISOString();
  const r: RunResult = { found: jobs.length, created: 0, updated: 0, gone: 0 };

  for (const j of jobs) {
    const hit = byId.get(j.externalId);
    if (hit) {
      await admin.from("imported_jobs").update({ title: j.title.slice(0, 200), url: j.url, last_seen_at: now, gone_at: null }).eq("id", hit.id);
      r.updated++;
      continue;
    }
    if (r.created >= MAX_NEW_PER_RUN) continue;
    const briefing = toBriefing(j);
    const { data: v, error } = await admin.from("vacancies").insert({ organization_id: imp.organization_id, title: briefing.title, created_by: actorId }).select("id").single();
    if (error || !v) continue;
    await admin.from("vacancy_briefings").insert({ vacancy_id: v.id, data: briefing });
    await admin.from("imported_jobs").insert({ import_id: imp.id, external_id: j.externalId.slice(0, 200), vacancy_id: v.id, title: j.title.slice(0, 200), url: j.url });
    r.created++;
  }

  const seen = new Set(jobs.map((j) => j.externalId));
  const goneIds = (known ?? []).filter((k) => !seen.has(k.external_id) && !k.gone_at).map((k) => k.id);
  if (goneIds.length) await admin.from("imported_jobs").update({ gone_at: now }).in("id", goneIds);
  r.gone = goneIds.length;

  await admin.from("audit_log").insert({ actor: actorId, action: "job_import_run", table_name: "job_imports", record_id: imp.id, details: r });
  return save(r);
}

/** Daily: all enabled sources (only while the global switch is on). */
export async function runAllImports(): Promise<{ sources: number; created: number; errors: number } | { skipped: string }> {
  if (!(await featureOn("import_customer_jobs"))) return { skipped: "ausgeschaltet" };
  const { data } = await createAdminClient().from("job_imports").select("id").eq("enabled", true);
  let created = 0;
  let errors = 0;
  for (const i of data ?? []) {
    const r = await runImport(i.id, null);
    created += r.created;
    if (r.error) errors++;
  }
  return { sources: data?.length ?? 0, created, errors };
}
