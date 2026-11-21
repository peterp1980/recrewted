import { getMessages } from "@/i18n";
import { requireAccess } from "@/lib/auth/session";
import { AtsSection } from "@/components/AtsSection";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Integrationen – recrewted" };

type Search = { org?: string; ats?: string; msg?: string; field?: string };

/** Customers connect their applicant tracking system (Personio & Co.) themselves. */
export default async function PortalIntegrationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requireAccess("/portal/integrationen");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: members } = await supabase.from("customer_members").select("organization_id, organizations(name)").eq("profile_id", session.userId);
  const list = members ?? [];
  const current = list.find((m) => m.organization_id === sp.org) ?? list[0];
  if (!current) return <main><p className="card">{getMessages().ats.notices.error}</p></main>;
  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{getMessages().nav.integrations}{current.organizations?.name ? ` – ${current.organizations.name}` : ""}</h1>
      {list.length > 1 && (
        <nav aria-label="Unternehmen" className="flex flex-wrap gap-2 text-sm">
          {list.map((m) => (
            <a key={m.organization_id} href={`/portal/integrationen?org=${m.organization_id}`} className={`rounded-lg border px-3 py-1 ${m.organization_id === current.organization_id ? "border-brand-700 bg-brand-50" : "border-neutral-300"}`}>{m.organizations?.name}</a>
          ))}
        </nav>
      )}
      <AtsSection organizationId={current.organization_id} from="portal" status={sp.ats} msg={sp.msg} field={sp.field} />
    </main>
  );
}
