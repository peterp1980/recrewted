import { ImageResponse } from "next/og";
import { getMessages } from "@/i18n";
import { idFromSlug, initials, salaryText } from "@/lib/jobs/format";
import { getPublicJob } from "@/lib/jobs/public";
import { onColor } from "@/lib/careers/profile";
import { ogFonts, Backdrop, OG_SIZE, Pill, Wordmark } from "@/lib/og/parts";

export const alt = "Stellenanzeige auf recrewted";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

/** Social preview of a job: title, employer, place, salary. No logos from foreign hosts, so rendering cannot fail on them. */
export default async function JobImage({ params }: { params: Promise<{ slug: string }> }) {
  const id = idFromSlug((await params).slug);
  const job = id ? await getPublicJob(id).catch(() => null) : null;
  const o = getMessages().briefing.options;
  const t = getMessages().jobs;
  const title = job?.title ?? "Offene Stelle";
  const salary = job ? salaryText(job.salaryMin, job.salaryMax, job.salaryPeriod) : null;
  const place = job ? (job.remote ? t.remote : job.location) : null;
  const employer = job?.employerName ?? "Vertrauliche Suche";
  return new ImageResponse(
    (
      <Backdrop>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Wordmark size={38} />
          <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.75)" }}>Bewerbung in 2 Minuten · ohne Anschreiben</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 16,
                fontSize: 28, fontWeight: 800, color: onColor(job?.employer?.color ?? "#152036"), backgroundColor: job?.employer?.color ?? "#152036",
              }}
            >
              {job?.employerName ? initials(job.employerName) : "?"}
            </div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{employer}</div>
          </div>
          <div style={{ display: "flex", fontSize: title.length > 40 ? 64 : 78, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2, maxWidth: 1050 }}>{title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {place && <Pill>{place}</Pill>}
          {job?.employmentType && <Pill>{o.employmentType[job.employmentType]}</Pill>}
          {salary && <Pill strong>{salary}</Pill>}
        </div>
      </Backdrop>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
