import { de } from "./de";

export const defaultLocale = "de";

/** Returns the messages for the current locale. Only German exists in the MVP. */
export function getMessages() {
  return de;
}

export type Tone = "sie" | "du";
export const isTone = (v: unknown): v is Tone => v === "sie" || v === "du";

/** Texts of the application form and thanks page in the customer's form of address. */
export function applyMessages(tone: Tone) {
  const { apply, applyDu } = de;
  if (tone === "sie") return apply;
  return { ...apply, ...applyDu, errors: { ...apply.errors, ...applyDu.errors } };
}
