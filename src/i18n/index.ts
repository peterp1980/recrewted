import { de } from "./de";

export const defaultLocale = "de";

/** Returns the messages for the current locale. Only German exists in the MVP. */
export function getMessages() {
  return de;
}
