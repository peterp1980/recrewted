import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { fromUrl } from "@/lib/tracking/attribution";
import { CONSENT_COOKIE, parseConsent } from "@/lib/tracking/consent";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/vacancies/paths";

const PUBLIC_EVENTS = ["page_view", "job_view", "apply_start"] as const;

/**
 * Browser events (F12): page views with statistics consent; portal activity of
 * signed-in customers for the "customer effort" KPI. IDs only, no content.
 */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.name !== "string") return new NextResponse(null, { status: 204 });
  const admin = createAdminClient();

  if (b.name === "portal_active") {
    const session = await getSession();
    if (!session || session.role !== "customer" || !isUuid(b.vacancyId)) return new NextResponse(null, { status: 204 });
    const { data: v } = await admin.from("vacancies").select("organization_id").eq("id", b.vacancyId).single();
    await admin.from("events").insert({ name: "portal_active", vacancy_id: b.vacancyId, organization_id: v?.organization_id ?? null });
    return new NextResponse(null, { status: 204 });
  }

  if (!(PUBLIC_EVENTS as readonly string[]).includes(b.name)) return new NextResponse(null, { status: 204 });
  const consent = parseConsent(req.cookies.get(CONSENT_COOKIE)?.value);
  if (!consent?.statistics) return new NextResponse(null, { status: 204 });

  const vacancyId = isUuid(b.vacancyId) ? b.vacancyId : null;
  let organizationId: string | null = null;
  if (vacancyId) {
    const { data: v } = await admin.from("vacancies").select("organization_id").eq("id", vacancyId).eq("status", "active").maybeSingle();
    if (!v) return new NextResponse(null, { status: 204 });
    organizationId = v.organization_id;
  }
  const entry = typeof b.search === "string" ? fromUrl(b.search) : null;
  await admin.from("events").insert({
    name: b.name,
    vacancy_id: vacancyId,
    organization_id: organizationId,
    entry_point: "jobboard",
    channel: entry?.utm_source ?? null,
    props: { path: typeof b.path === "string" ? b.path.slice(0, 200) : null },
  });
  return new NextResponse(null, { status: 204 });
}
