/**
 * Accepts only same-site relative paths as redirect target after login,
 * so links like ?next=https://evil.example cannot send users elsewhere.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(next)) return null;
  return next;
}

/** Areas that need a signed-in user. */
export const PROTECTED_PREFIXES = ["/admin", "/portal"] as const;

export function isProtected(path: string): boolean {
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
