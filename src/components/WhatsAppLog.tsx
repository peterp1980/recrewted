import { createClient } from "@/lib/supabase/server";

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
const STATE: Record<string, string> = { sent: "gesendet", delivered: "zugestellt", read: "gelesen", failed: "fehlgeschlagen" };

/** Staff: WhatsApp opt-in, sent messages with delivery state and the candidate's replies. */
export async function WhatsAppLog({ candidateId }: { candidateId: string }) {
  const supabase = await createClient();
  const [{ data: c }, { data: out }, { data: inbound }] = await Promise.all([
    supabase.from("candidates").select("whatsapp_opt_in_at, whatsapp_phone").eq("id", candidateId).single(),
    supabase.from("whatsapp_outbox").select("template, created_at, sent_at, delivery, last_error, cancelled_at").eq("candidate_id", candidateId).order("created_at", { ascending: false }).limit(20),
    supabase.from("whatsapp_inbound").select("body, received_at").eq("candidate_id", candidateId).order("received_at", { ascending: false }).limit(20),
  ]);
  if (!c?.whatsapp_opt_in_at && !(out ?? []).length && !(inbound ?? []).length) return null;
  return (
    <section aria-labelledby="wa-h" className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="wa-h" className="text-xl font-semibold">WhatsApp</h2>
      <p className="text-sm">{c?.whatsapp_opt_in_at ? `Eingewilligt am ${fmt.format(new Date(c.whatsapp_opt_in_at))} · ${c.whatsapp_phone}` : "Keine (oder widerrufene) Einwilligung."}</p>
      {(inbound ?? []).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Antworten</h3>
          <ul className="flex flex-col gap-1 text-sm">{(inbound ?? []).map((m, i) => <li key={i}><span className="text-muted">{fmt.format(new Date(m.received_at))}:</span> {m.body ?? "(kein Text)"}</li>)}</ul>
        </div>
      )}
      {(out ?? []).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Nachrichten</h3>
          <ul className="flex flex-col gap-1 text-sm text-ink/80">
            {(out ?? []).map((m, i) => (
              <li key={i}>
                {fmt.format(new Date(m.sent_at ?? m.created_at))} · {m.template} · {m.cancelled_at && !m.sent_at ? "nicht gesendet" : m.delivery ? STATE[m.delivery] : "wartet"}
                {m.last_error && <span className="text-red-800"> – {m.last_error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
