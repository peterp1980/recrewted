import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicJob } from "@/lib/jobs/format";
import { allPublicJobs } from "@/lib/jobs/public";
import { channelOn, type ChannelKey, type ChannelSettings } from "./channels";

/** Global switches and per-customer exceptions (0031). Read with the service role; feeds are public. */
export async function loadChannelSettings(): Promise<ChannelSettings> {
  const admin = createAdminClient();
  const [{ data: g }, { data: o }] = await Promise.all([
    admin.from("job_channels").select("key, enabled"),
    admin.from("organization_channels").select("organization_id, channel, enabled").eq("enabled", false),
  ]);
  const s: ChannelSettings = { global: {}, customerOff: {} };
  for (const r of g ?? []) s.global[r.key as ChannelKey] = r.enabled;
  for (const r of o ?? []) (s.customerOff[r.channel as ChannelKey] ??= []).push(r.organization_id);
  return s;
}

export async function jobsForChannel(key: ChannelKey): Promise<PublicJob[]> {
  const [jobs, s] = await Promise.all([allPublicJobs(), loadChannelSettings()]);
  return jobs.filter((j) => channelOn(s, key, j.organizationId));
}

/** Google for Jobs on a job page: structured data only when the channel is on for this customer. */
export async function googleOn(organizationId: string): Promise<boolean> {
  return channelOn(await loadChannelSettings(), "google", organizationId);
}
