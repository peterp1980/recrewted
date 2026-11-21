import { USER_ROLES } from "@/lib/supabase/database.types";
import type { UserRole } from "@/lib/auth/roles";

export type InviteInput = {
  email: string;
  fullName: string;
  role: UserRole;
  /** Existing organization (customers only). */
  organizationId: string | null;
  /** New organization to create (customers only), used when no existing one is chosen. */
  newOrganizationName: string | null;
};

export type InviteError = "email" | "fullName" | "role" | "organization";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export function isRole(v: string): v is UserRole {
  return (USER_ROLES as readonly string[]).includes(v);
}

/** Validates the invite form. Customers must belong to exactly one organization (existing or new). */
export function parseInvite(form: FormData): { ok: true; value: InviteInput } | { ok: false; error: InviteError } {
  const email = text(form.get("email")).toLowerCase();
  const fullName = text(form.get("fullName"));
  const role = text(form.get("role"));
  const organizationId = text(form.get("organizationId")) || null;
  const newOrganizationName = text(form.get("newOrganizationName")) || null;

  if (!EMAIL.test(email) || email.length > 254) return { ok: false, error: "email" };
  if (fullName.length < 2 || fullName.length > 120) return { ok: false, error: "fullName" };
  if (!isRole(role)) return { ok: false, error: "role" };

  if (role === "customer") {
    const hasExisting = organizationId !== null && UUID.test(organizationId);
    const hasNew = newOrganizationName !== null && newOrganizationName.length >= 2 && newOrganizationName.length <= 200;
    if (hasExisting === hasNew) return { ok: false, error: "organization" };
    return {
      ok: true,
      value: { email, fullName, role, organizationId: hasExisting ? organizationId : null, newOrganizationName: hasNew ? newOrganizationName : null },
    };
  }
  // Staff are not members of customer organizations.
  return { ok: true, value: { email, fullName, role, organizationId: null, newOrganizationName: null } };
}
