import { AppHeader } from "@/components/AppHeader";
import { requireAccess } from "@/lib/auth/session";

export const metadata = { robots: { index: false } };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAccess("/portal");
  return (
    <>
      <AppHeader session={session} />
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </>
  );
}
