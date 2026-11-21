// Short application (F2): only what is needed, no cover letter, no account.

export const CONSENT_VERSION = "2026-11-21";
export const MAX_CV_BYTES = 10 * 1024 * 1024;

export type ApplicationInput = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  processingConsent: boolean;
  talentPoolConsent: boolean;
};

export type ApplicationError = "firstName" | "lastName" | "contact" | "email" | "phone" | "consent";

const str = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** German and international numbers; stored as entered minus spaces. */
export function normalizePhone(raw: string): string | null {
  const p = raw.replace(/[\s()/.-]/g, "");
  if (!/^\+?\d{6,16}$/.test(p)) return null;
  return p;
}

export function parseApplication(form: FormData): { value: ApplicationInput; errors: ApplicationError[] } {
  const firstName = str(form.get("firstName"), 80);
  const lastName = str(form.get("lastName"), 80);
  const emailRaw = str(form.get("email"), 254).toLowerCase();
  const phoneRaw = str(form.get("phone"), 40);
  const email = emailRaw && EMAIL.test(emailRaw) ? emailRaw : null;
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

  const errors: ApplicationError[] = [];
  if (firstName.length < 1) errors.push("firstName");
  if (lastName.length < 1) errors.push("lastName");
  if (emailRaw && !email) errors.push("email");
  if (phoneRaw && !phone) errors.push("phone");
  if (!emailRaw && !phoneRaw) errors.push("contact");
  const processingConsent = form.get("processingConsent") === "on";
  if (!processingConsent) errors.push("consent");

  return {
    value: { firstName, lastName, email, phone, processingConsent, talentPoolConsent: form.get("talentPoolConsent") === "on" },
    errors,
  };
}

export type CvCheck = { ok: true; ext: "pdf" | "docx" | "jpg" | "png" | "webp" | "heic"; contentType: string } | { ok: false; error: "size" | "type" };

/** Checks the uploaded CV by its first bytes, not by the file name or browser-reported type. */
export function checkCv(bytes: Uint8Array): CvCheck {
  if (bytes.length === 0 || bytes.length > MAX_CV_BYTES) return { ok: false, error: "size" };
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (starts([0x25, 0x50, 0x44, 0x46])) return { ok: true, ext: "pdf", contentType: "application/pdf" };
  if (starts([0x50, 0x4b, 0x03, 0x04])) {
    // DOCX is a ZIP archive containing "word/"
    const head = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 4000)));
    if (head.includes("word/") || head.includes("[Content_Types].xml"))
      return { ok: true, ext: "docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
    return { ok: false, error: "type" };
  }
  if (starts([0xff, 0xd8, 0xff])) return { ok: true, ext: "jpg", contentType: "image/jpeg" };
  if (starts([0x89, 0x50, 0x4e, 0x47])) return { ok: true, ext: "png", contentType: "image/png" };
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return { ok: true, ext: "webp", contentType: "image/webp" };
  if (starts([0x66, 0x74, 0x79, 0x70], 4) && /heic|heix|mif1/.test(new TextDecoder("latin1").decode(bytes.subarray(8, 12))))
    return { ok: true, ext: "heic", contentType: "image/heic" };
  return { ok: false, error: "type" };
}
