// Roles inside a customer's team (0023). Owners manage team and integrations, members work on
// vacancies, viewers (departments) read shortlisted candidates, comment and give feedback.

export const MEMBER_ROLES = ["owner", "member", "viewer"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];
export const isMemberRole = (v: unknown): v is MemberRole => typeof v === "string" && (MEMBER_ROLES as readonly string[]).includes(v);

export const canEdit = (r: MemberRole | null | undefined) => r === "owner" || r === "member";
export const canManage = (r: MemberRole | null | undefined) => r === "owner";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ColleagueInput = { email: string; fullName: string; role: MemberRole };

export function parseColleague(form: FormData): { ok: true; value: ColleagueInput } | { ok: false; error: "email" | "fullName" | "role" } {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const fullName = String(form.get("fullName") ?? "").trim().replace(/\s+/g, " ");
  const role = String(form.get("memberRole") ?? "");
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, error: "email" };
  if (fullName.length < 2 || fullName.length > 120) return { ok: false, error: "fullName" };
  if (!isMemberRole(role)) return { ok: false, error: "role" };
  return { ok: true, value: { email, fullName, role } };
}
