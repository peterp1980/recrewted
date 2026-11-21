// Phone numbers for WhatsApp in international format (E.164). German numbers without country code
// are the common case ("0151 …" → "+49151…").

export function toE164(input: string, defaultCountry = "49"): string | null {
  let s = input.trim().replace(/\(0\)/g, "").replace(/[\s\-/().]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  else if (s.startsWith("0")) s = `+${defaultCountry}${s.slice(1)}`;
  else if (!s.startsWith("+")) return null;
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

/** Only mobile numbers can receive WhatsApp; in Germany they start with 15, 16 or 17. */
export const looksMobile = (e164: string) => !e164.startsWith("+49") || /^\+491[567]/.test(e164);
