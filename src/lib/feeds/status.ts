// Per-portal status of a vacancy (F9). Board, Google and feeds read active vacancies with salary.

export type PortalKey = "jobboard" | "google" | "indeed" | "ba" | "stepstone";
export type PortalStatus = { key: PortalKey; state: "online" | "offline" | "error" | "contract"; reason?: "notActive" | "noSalary" };

/** Portals without a contract/interface yet. Move a key out of here once its integration exists. */
export const NEEDS_CONTRACT: PortalKey[] = ["ba", "stepstone"];

export function portalStatuses(v: { status: string; salaryMin: number | null; salaryMax: number | null }): PortalStatus[] {
  return (["jobboard", "google", "indeed", "ba", "stepstone"] as PortalKey[]).map((key) => {
    if (NEEDS_CONTRACT.includes(key)) return { key, state: "contract" };
    if (v.status !== "active") return { key, state: "offline", reason: "notActive" };
    if (v.salaryMin === null || v.salaryMax === null) return { key, state: "error", reason: "noSalary" };
    return { key, state: "online" };
  });
}
