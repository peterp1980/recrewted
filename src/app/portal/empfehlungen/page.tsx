import { getMessages } from "@/i18n";
import { requireAccess } from "@/lib/auth/session";
import { ReferralsSection } from "@/components/ReferralsSection";
import { createClient } from "@/lib/supabase/server";
import { canEdit } from "@/lib/team/roles";
import { myRole } from "@/lib/team/server";

export const metadata = { title: "Empfehlungen – recrewted" };

/** Customers hand out personal referral links to their employees and see what came of them. */
export default async function PortalReferralsPage({ searchParams }: { searchParams: Promise<{ org?: string; r?: string }> }) {
  const session = await requireAccess("/portal/empfehlungen");
  const { org, r } = await searchParams;
  const supabase = await createClient();
  const { data: members } = await supabase.from("customer_members").select("organization_id, organizations(name)").eq("profile_id", session.userId);
  const list = members ?? [];
  const current = list.find((m) => m.organization_id === org) ?? list[0];
  const t = getMessages().referrals;
  if (!current) return <main><p className="card">{t.none}</p></main>;
  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t.title}{list.length > 1 && current.organizations?.name ? ` – ${current.organizations.name}` : ""}</h1>
      {list.length > 1 && (
        <nav aria-label="Unternehmen" className="flex flex-wrap gap-2 text-sm">
          {list.map((m) => (
            <a key={m.organization_id} href={`/portal/empfehlungen?org=${m.organization_id}`} className={`rounded-lg border px-3 py-1 ${m.organization_id === current.organization_id ? "border-brand-700 bg-brand-50" : "border-neutral-300"}`}>{m.organizations?.name}</a>
          ))}
        </nav>
      )}
      <ReferralsSection organizationId={current.organization_id} from="portal" status={r} canEdit={canEdit(await myRole(session.userId, current.organization_id))} />
    </main>
  );
}
