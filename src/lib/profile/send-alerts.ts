import "server-only";
import { jobPath } from "@/lib/jobs/format";
import { allPublicJobs } from "@/lib/jobs/public";
import { siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { matchJobs, parsePrefs } from "./alerts";
import { profileUrl } from "./server";

/** Daily: one e-mail per candidate with talent pool consent, listing new matching jobs. */
export async function queueJobAlerts(limit = 500): Promise<{ candidates: number; mails: number }> {
  const admin = createAdminClient();
  const { data: candidates } = await admin
    .from("candidates")
    .select("id, first_name, email, alert_prefs, talent_pool_consent_at, last_alert_at, applications(vacancy_id)")
    .not("talent_pool_consent_at", "is", null)
    .not("email", "is", null)
    .order("last_alert_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (!candidates?.length) return { candidates: 0, mails: 0 };

  const jobs = await allPublicJobs();
  const codes = [...new Set(candidates.map((c) => parsePrefs(c.alert_prefs).postalCode).filter((p): p is string => !!p))];
  const { data: places } = codes.length ? await admin.from("postal_codes").select("code, latitude, longitude").in("code", codes) : { data: [] };
  const coords = new Map((places ?? []).map((p) => [p.code, { lat: p.latitude, lng: p.longitude }]));

  let mails = 0;
  const now = new Date().toISOString();
  for (const c of candidates) {
    const prefs = parsePrefs(c.alert_prefs);
    const since = new Date(c.last_alert_at ?? c.talent_pool_consent_at!);
    const applied = new Set((c.applications ?? []).map((a) => a.vacancy_id));
    const matches = matchJobs(prefs, jobs, { since, applied, origin: prefs.postalCode ? (coords.get(prefs.postalCode) ?? null) : null });
    if (matches.length > 0 && c.email) {
      const { error } = await admin.from("mail_outbox").insert({
        candidate_id: c.id,
        to_email: c.email,
        template: "job_alert",
        data: {
          firstName: c.first_name,
          jobTitle: "",
          link: profileUrl(c.id),
          jobs: matches.map((j) => ({ title: j.title, employer: j.employerName, place: j.remote ? "Remote" : j.location, url: `${siteUrl()}${jobPath(j)}?utm_source=recrewted&utm_medium=email&utm_campaign=jobalert` })),
        },
      });
      if (!error) mails += 1;
    }
    await admin.from("candidates").update({ last_alert_at: now }).eq("id", c.id);
  }
  return { candidates: candidates.length, mails };
}
