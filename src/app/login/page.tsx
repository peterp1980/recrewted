import { redirect } from "next/navigation";
import { getMessages } from "@/i18n";
import { getSession } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/roles";
import { requestMagicLink } from "./actions";

export const metadata = { title: "Anmelden – recrewted", robots: { index: false } };

type Props = { searchParams: Promise<{ sent?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));

  const t = getMessages().login;
  const { sent, error } = await searchParams;
  const errorText = error === "email" ? t.invalidEmail : error === "rate" ? t.tooMany : error === "link" ? t.linkInvalid : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      {sent ? (
        <p role="status" className="rounded-md bg-emerald-50 p-4 text-emerald-900">
          {t.sent}
        </p>
      ) : (
        <>
          <p className="text-neutral-700">{t.lead}</p>
          {errorText && (
            <p role="alert" className="rounded-md bg-red-50 p-4 text-red-900">
              {errorText}
            </p>
          )}
          <form action={requestMagicLink} className="flex flex-col gap-3">
            <label htmlFor="email" className="font-medium">
              {t.email}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-md border border-neutral-400 px-3 py-2 text-base"
            />
            <button type="submit" className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700">
              {t.submit}
            </button>
          </form>
          <p className="text-sm text-neutral-600">{t.inviteOnly}</p>
        </>
      )}
    </main>
  );
}
