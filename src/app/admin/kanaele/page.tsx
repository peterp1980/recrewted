import { ExternalLink } from "lucide-react";
import { setChannelGlobal } from "@/app/channel-actions";
import { requireAccess } from "@/lib/auth/session";
import { CHANNELS } from "@/lib/feeds/channels";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";

type Props = { searchParams: Promise<{ ch?: string }> };
const MSG: Record<string, [string, boolean]> = {
  saved: ["Gespeichert. Feeds sind nach spätestens 15 Minuten aktuell; die Portale holen sie meist mehrmals täglich ab.", true],
  forbidden: ["Kanäle schalten nur Admins.", false],
  invalid: ["Unbekannter Kanal.", false],
};

/** F9: free job channels, switched for everyone; exceptions per customer on the customer page. */
export default async function ChannelsPage({ searchParams }: Props) {
  const session = await requireAccess("/admin/kanaele");
  const { ch } = await searchParams;
  const isAdmin = session.role === "admin";
  const supabase = await createClient();
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const [{ data: settings }, { data: off }, { data: apps }] = await Promise.all([
    supabase.from("job_channels").select("key, enabled, updated_at"),
    supabase.from("organization_channels").select("channel, organizations(name)").eq("enabled", false),
    // Applications per channel over 90 days ("in"): attribution written at apply time (F12).
    createAdminClient().from("application_attribution").select("channel, applications!inner(submitted_at)").gte("applications.submitted_at", since),
  ]);
  const on = new Map((settings ?? []).map((s) => [s.key, s.enabled]));
  const count = new Map<string, number>();
  for (const a of apps ?? []) if (a.channel) count.set(a.channel, (count.get(a.channel) ?? 0) + 1);
  const msg = ch ? MSG[ch] : null;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Kanäle für Stellenanzeigen</h1>
        <p className="mt-2 max-w-3xl text-ink/80">Kostenlose Kanäle, auf denen aktive Vakanzen erscheinen. Raus geht es per Feed oder strukturierten Daten, rein kommen die Bewerbungen über unsere Bewerbungsseite – jedem Kanal zugeordnet. Hier gilt der Schalter für alle Kunden; Ausnahmen je Kunde stehen beim Unternehmen.</p>
      </div>
      {msg && <p role="status" className={`rounded-lg p-3 text-sm ${msg[1] ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{msg[0]}</p>}
      <ul className="flex flex-col gap-3">
        <li className="card flex flex-col gap-1">
          <p className="font-semibold">recrewted-Jobbörse <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-900">immer an</span></p>
          <p className="text-sm text-muted">Grundlage für alle anderen Kanäle: dort liegt die Bewerbungsseite.</p>
        </li>
        {CHANNELS.map((c) => {
          const enabled = Boolean(on.get(c.key));
          const exceptions = (off ?? []).filter((o) => o.channel === c.key).map((o) => o.organizations?.name).filter(Boolean);
          return (
            <li key={c.key} id={c.key} className="card flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold">
                  {c.name}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${!c.ready ? "bg-neutral-100 text-ink/70" : enabled ? "bg-emerald-50 text-emerald-900" : "bg-neutral-100 text-ink/70"}`}>{!c.ready ? "Anmeldung nötig" : enabled ? "an" : "aus"}</span>
                </p>
                {isAdmin && c.ready && (
                  <form action={setChannelGlobal} className="flex items-center gap-2">
                    <input type="hidden" name="channel" value={c.key} />
                    {!enabled && <input type="hidden" name="enabled" value="on" />}
                    <button className={enabled ? "btn-secondary py-1.5 text-sm" : "btn-primary py-1.5 text-sm"}>{enabled ? "Für alle ausschalten" : "Für alle einschalten"}</button>
                  </form>
                )}
              </div>
              <p className="text-sm text-ink/80">{c.setup}</p>
              {c.via === "feed" && <p className="text-sm">Feed: <code className="break-all">{siteUrl()}/feeds/{c.key}.xml</code></p>}
              <p className="flex flex-wrap gap-x-4 text-sm text-muted">
                <span>Bewerbungen (90 Tage): {count.get(c.key) ?? 0}</span>
                {exceptions.length > 0 && <span>Aus bei: {exceptions.join(", ")}</span>}
                {c.signup && <a href={c.signup} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">Anmeldung <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted">Kostenpflichtig und deshalb nicht hier: StepStone, XING, meinestadt.de und bezahlte Anzeigen auf Indeed oder LinkedIn. Die laufen als Managed-Kampagnen mit Budget.</p>
    </main>
  );
}
