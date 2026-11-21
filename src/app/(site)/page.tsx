import Link from "next/link";
import { getMessages } from "@/i18n";

export default function Home() {
  const t = getMessages().home;
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">{t.headline}</h1>
      <p className="text-lg text-neutral-600">{t.lead}</p>
      <p>
        <Link href="/jobs" className="rounded-md bg-neutral-900 px-5 py-3 font-medium text-white hover:bg-neutral-700">
          {t.jobs}
        </Link>
      </p>
    </main>
  );
}
