import { saveCustomerChannels } from "@/app/channel-actions";
import { getSession } from "@/lib/auth/session";
import { CHANNELS } from "@/lib/feeds/channels";
import { createClient } from "@/lib/supabase/server";

/** Per customer: which free channels carry their vacancies. Global switches win (a channel off for all stays off). */
export async function CustomerChannels({ organizationId, status }: { organizationId: string; status?: string }) {
  const session = await getSession();
  const isAdmin = session?.role === "admin";
  const supabase = await createClient();
  const [{ data: global }, { data: own }] = await Promise.all([
    supabase.from("job_channels").select("key, enabled"),
    supabase.from("organization_channels").select("channel, enabled").eq("organization_id", organizationId),
  ]);
  const globalOn = new Map((global ?? []).map((g) => [g.key, g.enabled]));
  const mine = new Map((own ?? []).map((o) => [o.channel, o.enabled]));
  return (
    <section id="kanaele" aria-labelledby="kan-h" className="card flex scroll-mt-20 flex-col gap-3">
      <h2 id="kan-h" className="text-lg font-semibold">Kanäle für die Stellen dieses Kunden</h2>
      {status === "saved" && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Gespeichert.</p>}
      <p className="text-sm text-muted">Häkchen raus = die Stellen dieses Kunden erscheinen dort nicht, z. B. wenn er auf einem Portal selbst schaltet. Kanäle, die für alle aus sind, bleiben aus.</p>
      <form action={saveCustomerChannels} className="flex flex-col gap-2">
        <input type="hidden" name="organizationId" value={organizationId} />
        <fieldset disabled={!isAdmin} className="grid gap-2 sm:grid-cols-2">
          {CHANNELS.filter((c) => c.ready).map((c) => (
            <label key={c.key} className="flex items-center gap-2">
              <input type="checkbox" name={`ch_${c.key}`} defaultChecked={mine.get(c.key) ?? true} className="h-4 w-4" />
              {c.name}
              {!globalOn.get(c.key) && <span className="text-xs text-muted">(für alle aus)</span>}
            </label>
          ))}
        </fieldset>
        {isAdmin && <button className="btn-secondary self-start py-2">Speichern</button>}
      </form>
    </section>
  );
}
