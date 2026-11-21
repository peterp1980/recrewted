import { VacancyDetail } from "@/components/VacancyDetail";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; missing?: string; q?: string; c?: string; k?: string; a?: string; ct?: string }> };

export default async function PortalVacancyPage({ params, searchParams }: Props) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  return <VacancyDetail id={id} base="/portal" staff={false} search={search} />;
}
