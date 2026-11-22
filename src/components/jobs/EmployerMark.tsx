import { initials, type PublicJob } from "@/lib/jobs/format";

/** Employer logo from the career page, else initials in the brand colour; a sealed file for confidential searches. */
export function EmployerMark({ job, size = "md" }: { job: Pick<PublicJob, "employerName" | "employer">; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-16 w-16 text-xl" : "h-12 w-12 text-base";
  if (!job.employerName) {
    return (
      <span className={`${box} flex shrink-0 items-center justify-center border-2 border-ink bg-[repeating-linear-gradient(135deg,var(--color-ink)_0_2px,transparent_2px_7px)]`} title="Vertrauliche Suche">
        <span className="bg-paper px-1 font-mono text-[9px] font-semibold tracking-widest uppercase">Vertr.</span>
      </span>
    );
  }
  if (job.employer?.logo) {
    return (
      <span className={`${box} flex shrink-0 items-center justify-center overflow-hidden border-2 border-ink bg-white p-1.5`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- logos come from the career page editor (any https host) */}
        <img src={job.employer.logo} alt={job.employerName} loading="lazy" className="max-h-full max-w-full object-contain" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`${box} flex shrink-0 items-center justify-center border-2 border-ink font-display font-bold text-white`} style={{ backgroundColor: job.employer?.color ?? "#141311" }}>
      {initials(job.employerName)}
    </span>
  );
}
