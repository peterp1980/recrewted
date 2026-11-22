import { Building2 } from "lucide-react";
import { initials, type PublicJob } from "@/lib/jobs/format";

/** Employer logo from the career page, else initials in the brand colour; a neutral icon for confidential searches. */
export function EmployerMark({ job, size = "md" }: { job: Pick<PublicJob, "employerName" | "employer">; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-16 w-16 rounded-2xl text-xl" : "h-12 w-12 rounded-xl text-base";
  if (!job.employerName) {
    return (
      <span className={`${box} flex shrink-0 items-center justify-center bg-neutral-100 text-neutral-500`}>
        <Building2 className="h-1/2 w-1/2" aria-hidden="true" />
      </span>
    );
  }
  if (job.employer?.logo) {
    return (
      <span className={`${box} flex shrink-0 items-center justify-center overflow-hidden bg-white p-1.5 ring-1 ring-neutral-200`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- logos come from the career page editor (any https host) */}
        <img src={job.employer.logo} alt={job.employerName} loading="lazy" className="max-h-full max-w-full object-contain" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${box} flex shrink-0 items-center justify-center font-display font-bold text-white`}
      style={{ backgroundColor: job.employer?.color ?? "#0e1726" }}
    >
      {initials(job.employerName)}
    </span>
  );
}
