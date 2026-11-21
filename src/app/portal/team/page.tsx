import { getMessages } from "@/i18n";
import { FairnessSettings } from "@/components/FairnessSettings";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/lib/auth/session";
import { TeamSection } from "@/components/TeamSection";
import { canManage } from "@/lib/team/roles";
import { myOrganizations } from "@/lib/team/server";

export const metadata = { title: "Team – recrewted" };

/** Customers manage who of their colleagues works in the portal. */
export default async function PortalTeamPage({ searchParams }: { searchParams: Promise<{ org?: string; team?: string; fair?: string }> }) {
  const session = await requireAccess("/portal/team");
  const sp = await searchParams;
  const orgs = await myOrganizations(session.userId);
  const current = orgs.find((o) => o.id === sp.org) ?? orgs[0];
  const t = getMessages().team;
  const { data: orgRow } = current ? await (await createClient()).from("organizations").select("blind_review").eq("id", current.id).single() : { data: null };
  const blind = Boolean(orgRow?.blind_review);
  if (!current) return <main><p className="card">{t.notices.error}</p></main>;
  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t.title}{current.name ? ` – ${current.name}` : ""}</h1>
      {orgs.length > 1 && (
        <nav aria-label="Unternehmen" className="flex flex-wrap gap-2 text-sm">
          {orgs.map((o) => (
            <a key={o.id} href={`/portal/team?org=${o.id}`} className={`rounded-lg border px-3 py-1 ${o.id === current.id ? "border-brand-700 bg-brand-50" : "border-neutral-300"}`}>{o.name}</a>
          ))}
        </nav>
      )}
      <FairnessSettings organizationId={current.id} blindReview={blind} canChange={canManage(current.role)} status={sp.fair} />
      <TeamSection organizationId={current.id} from="portal" status={sp.team} canManage={canManage(current.role)} viewerId={session.userId} />
    </main>
  );
}
