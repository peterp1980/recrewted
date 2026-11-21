import Link from "next/link";
import { getMessages } from "@/i18n";
import { logRead } from "@/lib/audit";
import { scoreText } from "@/lib/scorecard/ratings";
import { createClient } from "@/lib/supabase/server";

const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeZone: "Europe/Berlin" });

/** Staff list of all applications of a vacancy, best score first. Showing names counts as reading applicant data (F19). */
export async function ApplicationsList({ vacancyId, viewerId }: { vacancyId: string; viewerId: string }) {
  const t = getMessages().applications;
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("id, status, score, submitted_at, candidates(first_name, last_name)")
    .eq("vacancy_id", vacancyId)
    .order("score", { ascending: false, nullsFirst: false })
    .order("submitted_at", { ascending: false });
  const apps = data ?? [];
  if (apps.length) await logRead(viewerId, "applications", apps.map((a) => a.id), "vacancy_applications");

  return (
    <section id="bewerbungen" aria-labelledby="bewerbungen-h" className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="bewerbungen-h" className="text-xl font-semibold">{t.title} ({apps.length})</h2>
        <Link href={`/admin/vacancies/${vacancyId}/pipeline`} className="text-sm underline">{getMessages().pipeline.open}</Link>
      </div>
      {apps.length === 0 ? (
        <p className="text-neutral-600">{t.none}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead><tr className="border-b border-neutral-300"><th className="py-2 pr-3">Name</th><th className="py-2 pr-3">{t.received}</th><th className="py-2 pr-3">Status</th><th className="py-2">{t.score}</th></tr></thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} className="border-b border-neutral-200">
                  <td className="py-2 pr-3"><Link href={`/admin/applications/${a.id}`} className="font-medium underline-offset-2 hover:underline">{a.candidates?.first_name} {a.candidates?.last_name}</Link></td>
                  <td className="py-2 pr-3">{fmt.format(new Date(a.submitted_at))}</td>
                  <td className="py-2 pr-3">{t.status[a.status]}</td>
                  <td className="py-2">{scoreText(a.score === null ? null : Number(a.score))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
