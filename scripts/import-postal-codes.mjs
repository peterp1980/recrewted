#!/usr/bin/env node
// Imports German postal codes with coordinates into public.postal_codes,
// which turns on the radius search of the job board (F1).
//
// Data: GeoNames postal codes, https://download.geonames.org/export/zip/DE.zip
// License: CC BY 4.0 – the job board footer credits GeoNames.
//
// Usage (needs the service role key, never commit it):
//   unzip DE.zip DE.txt
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-postal-codes.mjs DE.txt
import { readFileSync } from "node:fs";

const [file] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!file || !url || !key) {
  console.error("Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-postal-codes.mjs DE.txt");
  process.exit(1);
}

// GeoNames columns: country, postal code, place, admin1 name, admin1 code, admin2 name, admin2 code, admin3 name, admin3 code, lat, lng, accuracy
const seen = new Set();
const rows = [];
for (const line of readFileSync(file, "utf8").split("\n")) {
  const c = line.split("\t");
  if (c[0] !== "DE" || !/^\d{5}$/.test(c[1])) continue;
  const id = `${c[1]}|${c[2]}`;
  if (seen.has(id)) continue;
  seen.add(id);
  rows.push({ code: c[1], place: c[2], latitude: Number(c[9]), longitude: Number(c[10]) });
}
console.log(`${rows.length} postal codes read`);

for (let i = 0; i < rows.length; i += 1000) {
  const res = await fetch(`${url}/rest/v1/postal_codes?on_conflict=code,place`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(rows.slice(i, i + 1000)),
  });
  if (!res.ok) throw new Error(`Import failed at row ${i}: ${res.status} ${await res.text()}`);
  process.stdout.write(`\r${Math.min(i + 1000, rows.length)} / ${rows.length}`);
}

console.log(`
Done. Vacancies saved before the import get coordinates with this SQL (Supabase SQL editor):
  update public.vacancies v set latitude = p.latitude, longitude = p.longitude
  from public.postal_codes p where p.code = v.postal_code and v.latitude is null;`);
