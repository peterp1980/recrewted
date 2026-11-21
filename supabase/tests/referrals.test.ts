// Employee referrals (0021): customers manage their own referrers and see only aggregated results.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const OTHER = "00000000-0000-0000-0000-0000000000c2";
const ORG = "10000000-0000-0000-0000-00000000000a";
const ORG_B = "10000000-0000-0000-0000-00000000000b";
const VAC = "20000000-0000-0000-0000-00000000000a";
const REF = "70000000-0000-0000-0000-000000000001";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_referral_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1), ($2)", [CUSTOMER, OTHER]);
  await db.query("insert into organizations (id, name) values ($1, 'A'), ($2, 'B')", [ORG, ORG_B]);
  await db.query("insert into customer_members values ($1, $2), ($3, $4)", [ORG, CUSTOMER, ORG_B, OTHER]);
  await db.query("insert into vacancies (id, organization_id, title, status) values ($1, $2, 'Job', 'active')", [VAC, ORG]);
  await db.query("insert into referrers (id, organization_id, name, code) values ($1, $2, 'Lena', 'abcd1234')", [REF, ORG]);
  for (const [i, status, sl] of [[1, "screening", null], [2, "shortlisted", "now()"], [3, "hired", "now()"]] as const) {
    const cand = `40000000-0000-0000-0000-00000000000${i}`;
    const app = `50000000-0000-0000-0000-00000000000${i}`;
    await db.query("insert into candidates (id, first_name, last_name, email) values ($1, 'X', 'Y', $2)", [cand, `x${i}@example.org`]);
    await db.query(`insert into applications (id, vacancy_id, candidate_id, status, shortlisted_at) values ($1, $2, $3, $4, ${sl ?? "null"})`, [app, VAC, cand, status]);
    await db.query("insert into application_attribution (application_id, entry_point, referrer_id) values ($1, 'career_page', $2)", [app, REF]);
  }
});
afterAll(async () => db?.end());

describe("referrals", () => {
  it("lets customers create referrers for their own organization only", () =>
    asUser(db, CUSTOMER, async (c) => {
      await c.query("insert into referrers (organization_id, name, code) values ($1, 'Tom', 'tom12345')", [ORG]);
      expect(await errorOf(c, () => c.query("insert into referrers (organization_id, name, code) values ($1, 'Fremd', 'fremd123')", [ORG_B]))).toMatch(/row-level security/);
      expect(await errorOf(c, () => c.query("insert into referrers (organization_id, name, code) values ($1, 'Bad', 'BAD!')", [ORG]))).toMatch(/check constraint/);
    }));

  it("shows aggregated results to the customer, nothing to others", async () => {
    await asUser(db, CUSTOMER, async (c) => {
      const r = (await c.query("select * from public.referral_stats($1)", [ORG])).rows;
      expect(r).toEqual([{ referrer_id: REF, applications: "3", shortlisted: "2", hired: "1" }]);
    });
    await asUser(db, OTHER, async (c) => {
      expect((await c.query("select * from public.referral_stats($1)", [ORG])).rows).toEqual([]);
      expect((await c.query("select * from referrers")).rows).toEqual([]);
    });
  });
});
