import { isStaff, type UserRole } from "@/lib/auth/roles";

/** Vacancy pages live under /admin for staff and /portal for customers. */
export const vacancyBase = (role: UserRole) => (isStaff(role) ? "/admin" : "/portal");
export const vacancyPath = (role: UserRole, id: string) => `${vacancyBase(role)}/vacancies/${id}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
