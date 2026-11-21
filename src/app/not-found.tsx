import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Diese Seite gibt es nicht (mehr).</h1>
      <p className="text-ink/80">Wenn Sie eine Stelle gesucht haben: Sie ist vermutlich schon besetzt.</p>
      <Link href="/jobs" className="self-start underline">Zu den offenen Stellen</Link>
    </main>
  );
}
