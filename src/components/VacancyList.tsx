import Link from "next/link";
import { getMessages } from "@/i18n";
import type { Enums } from "@/lib/supabase/database.types";

export type VacancyListItem = {
  id: string;
  title: string;
  status: Enums<"vacancy_status">;
  organization?: string;
  submitted: boolean;
};

export function VacancyList({ items, base }: { items: VacancyListItem[]; base: string }) {
  const t = getMessages().vacancy;
  if (items.length === 0) return <p className="text-neutral-600">{t.empty}</p>;
  return (
    <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
      {items.map((v) => (
        <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
          <div>
            <Link href={`${base}/vacancies/${v.id}`} className="font-medium underline-offset-2 hover:underline">
              {v.title}
            </Link>
            {v.organization && <span className="ml-2 text-sm text-neutral-600">{v.organization}</span>}
          </div>
          <div className="flex gap-2 text-sm">
            <span className="rounded bg-neutral-100 px-2 py-0.5">{t.status[v.status]}</span>
            <span className={`rounded px-2 py-0.5 ${v.submitted ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
              {v.submitted ? t.briefingSubmitted : t.briefingOpen}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
