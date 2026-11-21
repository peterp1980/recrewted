import type { Enums } from "@/lib/supabase/database.types";

export type UserRole = Enums<"user_role">;

export const isStaff = (role: UserRole | null | undefined): boolean => role === "admin" || role === "recruiter";

/** Where a signed-in user lands after login. */
export function homeFor(role: UserRole | null | undefined): string {
  return isStaff(role) ? "/admin" : "/portal";
}

/** Whether a role may open a path. Unknown areas are open to any signed-in user. */
export function canAccess(role: UserRole | null | undefined, path: string): boolean {
  if (path === "/admin/users" || path.startsWith("/admin/users/")) return role === "admin";
  if (path === "/admin" || path.startsWith("/admin/")) return isStaff(role);
  if (path === "/portal" || path.startsWith("/portal/")) return role === "customer";
  return true;
}
