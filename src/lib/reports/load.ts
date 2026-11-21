import "server-only";
import { vacancyKpis } from "@/lib/portal/load";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WeeklyReport } from "./weekly";

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

/**
 * Report of one customer over the last 7 days. Uses the service role: call only after
 * checking that the viewer may see this organization (staff or member).
 */
export async function loadWeeklyReport(organizationId: string, now = new Date()): Promise<WeeklyReport | null> {
  const admin = createAdminClient();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const { data: org } = await admin.from("organizations").select("name").eq("id", organizationId).maybeSingle();
  if (!org) return null;
  const { data: vacancies } = await admin
    .from("vacancies")
    .select("id, title, status, published_at, filled_at")
    .eq("organization_id", organizationId)
    .in("status", ["active", "paused", "filled"])
    .order("published_at", { ascending: false });
  const relevant = (vacancies ?? []).filter((v) => v.status !== "filled" || (v.filled_at && Date.parse(v.filled_at) > weekAgo.getTime()));
  const rows = await Promise.all(
    relevant.map(async (v) => {
      const [k, { count: fresh }, { data: first }] = await Promise.all([
        vacancyKpis(v.id),
        admin.from("applications").select("id", { count: "exact", head: true }).eq("vacancy_id", v.id).gte("submitted_at", weekAgo.toISOString()),
        admin.from("applications").select("shortlisted_at").eq("vacancy_id", v.id).not("shortlisted_at", "is", null).order("shortlisted_at").limit(1).maybeSingle(),
      ]);
      return {
        title: v.title,
        status: v.status,
        applications: k.funnel.applications,
        newThisWeek: fresh ?? 0,
        qualified: k.funnel.qualified,
        shortlisted: k.funnel.shortlisted,
        hired: k.funnel.hired,
        costPerQualified: k.costPerQualified,
        publishedAt: v.published_at,
        firstShortlistAt: first?.shortlisted_at ?? null,
      };
    }),
  );
  return { organization: org.name, from: fmt.format(weekAgo), to: fmt.format(now), vacancies: rows };
}
