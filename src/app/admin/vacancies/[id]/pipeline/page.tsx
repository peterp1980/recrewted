import Link from "next/link";
import { notFound } from "next/navigation";
import { getMessages } from "@/i18n";
import { logRead } from "@/lib/audit";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vacancies/paths";
import { Board } from "./Board";

export const metadata = { title: "Pipeline – recrewted" };

export default async function PipelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const session = await requireAccess("/admin");
  const supabase = await createClient();
  const [{ data: vacancy }, { data: apps }] = await Promise.all([
    supabase.from("vacancies").select("id, title").eq("id", id).maybeSingle(),
    supabase.from("applications").select("id, status, score, submitted_at, candidates(first_name, last_name)").eq("vacancy_id", id).order("score", { ascending: false, nullsFirst: false }),
  ]);
  if (!vacancy) notFound();
  if (apps?.length) await logRead(session.userId, "applications", apps.map((a) => a.id), "pipeline");
  const t = getMessages().pipeline;

  return (
    <main className="flex flex-col gap-4">
      <Link href={`/admin/vacancies/${id}`} className="text-sm underline">{getMessages().application.back}: {vacancy.title}</Link>
      <h1 className="text-2xl font-semibold">{t.title}: {vacancy.title}</h1>
      <Board
        cards={(apps ?? []).map((a) => ({
          id: a.id,
          name: `${a.candidates?.first_name ?? ""} ${a.candidates?.last_name ?? ""}`.trim(),
          status: a.status,
          score: a.score === null ? null : Number(a.score),
          submittedAt: a.submitted_at,
        }))}
      />
    </main>
  );
}
