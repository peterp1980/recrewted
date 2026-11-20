import { getMessages } from "@/i18n";

export default function Home() {
  const t = getMessages();
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">{t.home.headline}</h1>
      <p className="text-lg text-neutral-600">{t.home.lead}</p>
    </main>
  );
}
