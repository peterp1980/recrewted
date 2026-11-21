import { getMessages } from "@/i18n";

export default function AdminHome() {
  const t = getMessages().admin;
  return (
    <main className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="text-neutral-700">{t.lead}</p>
    </main>
  );
}
