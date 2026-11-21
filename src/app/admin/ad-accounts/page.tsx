import { getMessages } from "@/i18n";
import { PLATFORMS } from "@/lib/campaigns/tracking";
import { createClient } from "@/lib/supabase/server";
import { Notice } from "@/components/Notice";
import { createAdAccount } from "@/app/campaign-actions";

export const metadata = { title: "Werbekonten – recrewted" };
const input = "w-full rounded-md border border-neutral-400 px-3 py-2";

export default async function AdAccountsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const t = getMessages().adAccounts;
  const supabase = await createClient();
  const { data: accounts } = await supabase.from("ad_accounts").select("id, platform, external_account_id, display_name").eq("owner", "recrewted").order("platform");
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="text-neutral-700">{t.lead}</p>
      {s === "saved" && <Notice kind="ok">{t.saved}</Notice>}
      {s === "invalid" && <Notice kind="error">{t.invalid}</Notice>}
      {accounts?.length ? (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {accounts.map((a) => <li key={a.id} className="p-3"><span className="font-medium">{a.display_name}</span> <span className="text-neutral-600">· {t.platforms[a.platform as keyof typeof t.platforms]} · {a.external_account_id}</span></li>)}
        </ul>
      ) : <p className="text-neutral-600">{t.none}</p>}
      <form action={createAdAccount} className="grid max-w-xl gap-3">
        <label className="grid gap-1"><span>{t.platform}</span>
          <select name="platform" className={input}>{PLATFORMS.map((p) => <option key={p} value={p}>{t.platforms[p]}</option>)}</select>
        </label>
        <label className="grid gap-1"><span>{t.externalId}</span><input name="externalId" required className={input} /></label>
        <label className="grid gap-1"><span>{t.name}</span><input name="name" required className={input} /></label>
        <button type="submit" className="justify-self-start rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700">{t.add}</button>
      </form>
    </main>
  );
}
