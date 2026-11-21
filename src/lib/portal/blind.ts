// Blind review (0026): until the customer chooses "get to know", candidates appear as "Kandidat:in A, B, …".
// Letters follow the order of the shortlist, so they stay the same on every page.

export function letter(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export function pseudonyms(apps: { id: string; shortlisted_at: string | null }[]): Map<string, string> {
  const sorted = apps
    .filter((a) => a.shortlisted_at)
    .sort((a, b) => Date.parse(a.shortlisted_at!) - Date.parse(b.shortlisted_at!) || a.id.localeCompare(b.id));
  return new Map(sorted.map((a, i) => [a.id, `Kandidat:in ${letter(i)}`]));
}

/** Display name: the real name if visible to this viewer (RLS), otherwise the pseudonym. */
export function displayName(c: { first_name: string; last_name: string } | null | undefined, pseudonym: string | undefined): string {
  return c ? `${c.first_name} ${c.last_name}` : (pseudonym ?? "Kandidat:in (anonym)");
}
