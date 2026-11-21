import Link from "next/link";
import { notFound } from "next/navigation";
import { CareerEditor } from "@/components/career/CareerEditor";
import { getMessages } from "@/i18n";
import { isStaff } from "@/lib/auth/roles";
import { requireAccess } from "@/lib/auth/session";
import { loadEditor } from "@/lib/careers/editor-data";

export const metadata = { title: "Karriereseite bearbeiten – recrewted" };

export default async function AdminCareerEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAccess(`/admin/organizations/${id}/karriereseite`);
  const data = await loadEditor(id);
  if (!data) notFound();
  return (
    <main className="flex flex-col gap-4">
      <div>
        <Link href={`/admin/organizations/${id}`} className="text-sm underline">{data.name}</Link>
        <h1 className="mt-1 text-2xl font-semibold">{getMessages().editor.title(data.name)}</h1>
      </div>
      <CareerEditor {...data} canPublish={isStaff(session.role)} />
    </main>
  );
}
