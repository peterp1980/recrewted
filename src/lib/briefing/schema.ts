// Briefing (F13): what the customer tells us about the vacancy. Stored as
// JSON in vacancy_briefings.data; a DB trigger copies the core fields
// (title, location, employment type, salary) into the vacancy.

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "mini_job", "working_student", "apprenticeship", "freelance"] as const;
export const REMOTE_OPTIONS = ["onsite", "hybrid", "remote"] as const;
export const SALARY_PERIODS = ["year", "month", "hour"] as const;
export const CATEGORIES = [
  "craft", "engineering", "it", "healthcare", "social", "office", "sales", "marketing",
  "logistics", "production", "hospitality", "finance_legal", "construction", "other",
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type RemoteOption = (typeof REMOTE_OPTIONS)[number];
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];
export type Category = (typeof CATEGORIES)[number];

export type Briefing = {
  v: 1;
  title: string;
  employmentType: EmploymentType | null;
  category: Category | null;
  location: string;
  postalCode: string;
  remote: RemoteOption;
  tasks: string[];
  mustHave: string[];
  niceToHave: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: SalaryPeriod;
  /** ISO date, or null for "as soon as possible". */
  startDate: string | null;
  benefits: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
};

export type BriefingField =
  | "title" | "employmentType" | "category" | "location" | "postalCode" | "tasks" | "mustHave" | "salary" | "salaryRange" | "startDate" | "contactName" | "contactEmail";

export const emptyBriefing = (): Briefing => ({
  v: 1, title: "", employmentType: null, category: null, location: "", postalCode: "", remote: "onsite", tasks: [], mustHave: [], niceToHave: [],
  salaryMin: null, salaryMax: null, salaryPeriod: "year", startDate: null, benefits: [],
  contactName: "", contactEmail: "", contactPhone: "", notes: "",
});

const MAX_ITEMS = 15;
const MAX_TEXT = 300;

const str = (v: unknown, max = MAX_TEXT) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  typeof v === "string" && (options as readonly string[]).includes(v) ? (v as T) : fallback;
const lines = (v: unknown) =>
  [...new Set(str(v, 5000).split(/\r?\n/).map((l) => l.replace(/^[-•*]\s*/, "").trim().slice(0, MAX_TEXT)).filter(Boolean))].slice(0, MAX_ITEMS);
const amount = (v: unknown): number | null => {
  const s = str(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n < 10_000_000 ? Math.round(n * 100) / 100 : null;
};
const isoDate = (v: unknown) => {
  const s = str(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
};

/** Reads the briefing form. Tolerant: incomplete input is kept as a draft. */
export function parseBriefingForm(form: FormData): Briefing {
  const g = (k: string) => form.get(k);
  return {
    v: 1,
    title: str(g("title"), 150),
    employmentType: oneOf(g("employmentType"), [...EMPLOYMENT_TYPES, ""] as const, "") || null,
    category: oneOf(g("category"), [...CATEGORIES, ""] as const, "") || null,
    location: str(g("location"), 150),
    postalCode: str(g("postalCode"), 5).replace(/\D/g, ""),
    remote: oneOf(g("remote"), REMOTE_OPTIONS, "onsite"),
    tasks: lines(g("tasks")),
    mustHave: lines(g("mustHave")),
    niceToHave: lines(g("niceToHave")),
    salaryMin: amount(g("salaryMin")),
    salaryMax: amount(g("salaryMax")),
    salaryPeriod: oneOf(g("salaryPeriod"), SALARY_PERIODS, "year"),
    startDate: isoDate(g("startDate")),
    benefits: lines(g("benefits")),
    contactName: str(g("contactName"), 120),
    contactEmail: str(g("contactEmail"), 254).toLowerCase(),
    contactPhone: str(g("contactPhone"), 40),
    notes: str(g("notes"), 3000),
  };
}

/** Reads stored JSON back into a briefing (unknown or missing fields fall back to defaults). */
export function fromStored(data: unknown): Briefing {
  if (!data || typeof data !== "object") return emptyBriefing();
  const d = data as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAX_ITEMS) : []);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    ...emptyBriefing(),
    title: str(d.title, 150),
    employmentType: oneOf(d.employmentType, [...EMPLOYMENT_TYPES, ""] as const, "") || null,
    category: oneOf(d.category, [...CATEGORIES, ""] as const, "") || null,
    location: str(d.location, 150),
    postalCode: str(d.postalCode, 5).replace(/\D/g, ""),
    remote: oneOf(d.remote, REMOTE_OPTIONS, "onsite"),
    tasks: arr(d.tasks),
    mustHave: arr(d.mustHave),
    niceToHave: arr(d.niceToHave),
    salaryMin: num(d.salaryMin),
    salaryMax: num(d.salaryMax),
    salaryPeriod: oneOf(d.salaryPeriod, SALARY_PERIODS, "year"),
    startDate: isoDate(d.startDate),
    benefits: arr(d.benefits),
    contactName: str(d.contactName, 120),
    contactEmail: str(d.contactEmail, 254),
    contactPhone: str(d.contactPhone, 40),
    notes: str(d.notes, 3000),
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fields that must be complete before the briefing can be submitted. Salary is mandatory (EU pay transparency). */
export function missingForSubmit(b: Briefing): BriefingField[] {
  const missing: BriefingField[] = [];
  if (b.title.length < 3) missing.push("title");
  if (!b.employmentType) missing.push("employmentType");
  if (!b.category) missing.push("category");
  if (b.remote !== "remote" && b.location.length < 2) missing.push("location");
  if (b.remote !== "remote" && !/^\d{5}$/.test(b.postalCode)) missing.push("postalCode");
  if (b.tasks.length === 0) missing.push("tasks");
  if (b.mustHave.length === 0) missing.push("mustHave");
  // Salary is optional; if one value is given, both are needed and "from" must not exceed "to".
  if ((b.salaryMin === null) !== (b.salaryMax === null)) missing.push("salary");
  else if (b.salaryMin !== null && b.salaryMax !== null && b.salaryMin > b.salaryMax) missing.push("salaryRange");
  if (b.startDate !== null && b.startDate < new Date().toISOString().slice(0, 10)) missing.push("startDate");
  if (b.contactName.length < 2) missing.push("contactName");
  if (!EMAIL.test(b.contactEmail)) missing.push("contactEmail");
  return missing;
}
