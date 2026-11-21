import { getMessages } from "@/i18n";
import { requireAccess } from "@/lib/auth/session";
import { CareerEditor } from "@/components/career/CareerEditor";
import { loadEditor } from "@/lib/careers/editor-data";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Karriereseite – recrewted" };

/** Customers edit their own career page; recrewted publishes after review. */
export default async function PortalCareerEditorPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const session = await requireAccess("/portal/karriereseite");
  const { org } = await searchParams;
  const supabase = await createClient();
  const { data: members } = await supabase.from("customer_members").select("organization_id").eq("profile_id", session.userId);
  const ids = (members ?? []).map((m) => m.organization_id);
  const orgId = org && ids.includes(org) ? org : ids[0];
  const data = orgId ? await loadEditor(orgId) : null;
  const t = getMessages().editor;
  if (!data) return <main><p className="card">{t.noPage}</p></main>;
  return (
    <main className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t.title(data.name)}</h1>
        <p className="mt-1 max-w-3xl text-ink/80">{t.portalLead}</p>
      </div>
      <CareerEditor {...data} canPublish={false} />
    </main>
  );
}
