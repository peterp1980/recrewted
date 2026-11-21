import { getMessages } from "@/i18n";
import { createClient } from "@/lib/supabase/server";

export default async function PortalHome() {
  const t = getMessages().portal;
  const supabase = await createClient();
  // RLS returns only the customer's own organizations.
  const { data: orgs } = await supabase.from("organizations").select("id, name").order("name");

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      {orgs && orgs.length > 0 ? (
        <p className="text-neutral-700">
          {t.organization}: <strong>{orgs.map((o) => o.name).join(", ")}</strong>
        </p>
      ) : (
        <p role="status" className="rounded-md bg-amber-50 p-4 text-amber-900">
          {t.noOrganization}
        </p>
      )}
      <p className="text-neutral-700">{t.lead}</p>
    </main>
  );
}
