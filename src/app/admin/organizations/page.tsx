import Link from "next/link";
import { getMessages } from "@/i18n";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createOrganization } from "./actions";

export const metadata = { title: "Unternehmen – recrewted" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function OrganizationsPage({ searchParams }: Props) {
  const session = await requireAccess("/admin/organizations");
  const { error } = await searchParams;
  const errorText = error && error in getMessages().organizations.errors ? getMessages().organizations.errors[error as keyof ReturnType<typeof getMessages>["organizations"]["errors"]] : null;
  const t = getMessages().organizations;
  const supabase = await createClient();
  const { data: orgs } = await supabase.from("organizations").select("id, name, slug, career_enabled, vacancies(count), career_pages(status)").order("name");

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p className="mt-1 max-w-2xl text-ink/80">{t.lead}</p>
      </div>
      {errorText && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-900">{errorText}</p>}
      {session.role === "admin" && (
        <form action={createOrganization} className="card grid max-w-2xl gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <h2 className="font-semibold sm:col-span-3">{t.newTitle}</h2>
          <label className="grid gap-1">
            <span className="text-sm font-medium">{t.name}</span>
            <input name="name" required minLength={2} maxLength={150} className="rounded-lg border border-neutral-300 px-3 py-2" />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">{t.websiteField}</span>
            <input name="website" inputMode="url" placeholder="www.beispiel.de" className="rounded-lg border border-neutral-300 px-3 py-2" />
          </label>
          <button type="submit" className="btn-primary">{t.create}</button>
        </form>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(orgs ?? []).map((o) => {
          const n = (o.vacancies as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
          return (
            <li key={o.id}>
              <Link href={`/admin/organizations/${o.id}`} className="card card-hover flex flex-col gap-2">
                <span className="font-semibold">{o.name}</span>
                <span className="text-sm text-muted">{t.vacancies(n)}</span>
                <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${o.career_enabled ? "bg-brand-50 text-brand-800" : "bg-neutral-100 text-muted"}`}>
                  {o.career_enabled ? `${t.careerOn} · /karriere/${o.slug}` : t.careerOff}
                </span>
                {(o.career_pages as unknown as { status: string } | null)?.status === "in_review" && (
                  <span className="self-start rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">{getMessages().editor.status.in_review}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
