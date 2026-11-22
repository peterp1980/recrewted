import { ImageResponse } from "next/og";
import { getMessages } from "@/i18n";
import { idFromSlug, initials, salaryText } from "@/lib/jobs/format";
import { getPublicJob } from "@/lib/jobs/public";
import { Backdrop, INK, Label, OG_SIZE, ogFonts, Pill, Stamp, Wordmark } from "@/lib/og/parts";

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
          <Wordmark size={34} />
          <Label>Stellenanzeige</Label>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 58, height: 58, border: `3px solid ${INK}`, fontFamily: "Serif", fontWeight: 600, fontSize: 24, color: "#fff", backgroundColor: job?.employer?.color ?? INK }}>
              {job?.employerName ? initials(job.employerName) : "?"}
            </div>
            <div style={{ display: "flex", fontSize: 30 }}>{employer}</div>
          </div>
          <div style={{ display: "flex", fontFamily: "Serif", fontWeight: 600, fontSize: title.length > 40 ? 62 : 78, lineHeight: 1.0, letterSpacing: -2, maxWidth: 980 }}>{title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {place && <Pill>{place}</Pill>}
            {job?.employmentType && <Pill>{o.employmentType[job.employmentType]}</Pill>}
            {salary && <Pill strong>{salary}</Pill>}
          </div>
          <Stamp>2 Min.</Stamp>
        </div>
      </Backdrop>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
