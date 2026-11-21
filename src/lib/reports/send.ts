import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";
import { loadWeeklyReport } from "./load";
import { vacancyLine, worthSending } from "./weekly";

/** Monday morning: one mail per customer user, for customers with the weekly report switched on. */
export async function queueWeeklyReports(now = new Date()): Promise<{ organizations: number; mails: number }> {
  const admin = createAdminClient();
  const { data: orgs } = await admin.from("organizations").select("id, customer_members(profile_id)").eq("weekly_report", true);
  let mails = 0;
  let sentOrgs = 0;
  for (const o of orgs ?? []) {
    const members = (o.customer_members ?? []).map((m) => m.profile_id);
    if (members.length === 0) continue;
    const report = await loadWeeklyReport(o.id, now);
    if (!report || !worthSending(report)) continue;
    sentOrgs += 1;
    const lines = report.vacancies.map((v) => ({ title: v.title, text: vacancyLine(v).replace(/ /g, " ") }));
    for (const id of members) {
      const { data } = await admin.auth.admin.getUserById(id);
      const email = data.user?.email;
      if (!email) continue;
      const { data: profile } = await admin.from("profiles").select("full_name").eq("id", id).maybeSingle();
      const { error } = await admin.from("mail_outbox").insert({
        to_email: email,
        template: "weekly_report",
        data: { firstName: profile?.full_name?.split(" ")[0] ?? "", jobTitle: "", organization: report.organization, lines, link: `${siteUrl()}/portal` },
      });
      if (!error) mails += 1;
    }
  }
  return { organizations: sentOrgs, mails };
}

/** Monday in Germany. */
export const isMondayInBerlin = (d = new Date()) => new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Europe/Berlin" }).format(d) === "Mon";
