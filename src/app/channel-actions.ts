"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { CHANNELS } from "@/lib/feeds/channels";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";

// F9: admins switch free channels for everyone and per customer.

async function adminOnly(back: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect(`${back}?ch=forbidden`);
  return session;
}
const isKey = (k: string) => CHANNELS.some((c) => c.key === k && c.ready);

export async function setChannelGlobal(form: FormData) {
  const session = await adminOnly("/admin/kanaele");
  const key = String(form.get("channel") ?? "");
  const enabled = form.get("enabled") === "on";
  if (!isKey(key)) redirect("/admin/kanaele?ch=invalid");
  await (await createClient()).from("job_channels").update({ enabled, updated_at: new Date().toISOString(), updated_by: session.userId }).eq("key", key);
  await audit(session.userId, "channel_switched", "job_channels", null, { channel: key, enabled });
  revalidatePath("/admin/kanaele");
  redirect(`/admin/kanaele?ch=saved#${key}`);
}

/** Per customer: every ready channel is on unless switched off here. */
export async function saveCustomerChannels(form: FormData) {
  const organizationId = String(form.get("organizationId") ?? "");
  const back = `/admin/organizations/${organizationId}`;
  const session = await adminOnly(back);
  if (!isUuid(organizationId)) redirect("/admin/organizations");
  const rows = CHANNELS.filter((c) => c.ready).map((c) => ({ organization_id: organizationId, channel: c.key, enabled: form.get(`ch_${c.key}`) === "on", updated_at: new Date().toISOString() }));
  const supabase = await createClient();
  const { error } = await supabase.from("organization_channels").upsert(rows, { onConflict: "organization_id,channel" });
  if (error) redirect(`${back}?ch=error#kanaele`);
  await audit(session.userId, "customer_channels_saved", "organizations", organizationId, { off: rows.filter((r) => !r.enabled).map((r) => r.channel) });
  revalidatePath(back);
  redirect(`${back}?ch=saved#kanaele`);
}
