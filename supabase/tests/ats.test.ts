// ATS handover (0022): automatic queueing by status, protected key, customer visibility.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
const ORG_B = "10000000-0000-0000-0000-00000000000b";
const VAC = "20000000-0000-0000-0000-00000000000a";
const VAC_B = "20000000-0000-0000-0000-00000000000b";
const CONN = "80000000-0000-0000-0000-000000000001";
const app = (i: number) => `50000000-0000-0000-0000-00000000000${i}`;
let db: Client;

const transfers = async () => (await db.query("select application_id from ats_transfers order by application_id")).rows.map((r) => r.application_id);
const setStatus = (i: number, s: string) => db.query("update applications set status = $2 where id = $1", [app(i), s]);

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_ats_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1)", [CUSTOMER]);
  await db.query("insert into organizations (id, name) values ($1, 'A'), ($2, 'B')", [ORG, ORG_B]);
  await db.query("insert into customer_members values ($1, $2)", [ORG, CUSTOMER]);
  await db.query("insert into vacancies (id, organization_id, title, status) values ($1, $2, 'Job', 'active'), ($3, $4, 'Job B', 'active')", [VAC, ORG, VAC_B, ORG_B]);
  for (let i = 1; i <= 4; i++) {
    const cand = `40000000-0000-0000-0000-00000000000${i}`;
    await db.query("insert into candidates (id, first_name, last_name, email) values ($1, 'X', 'Y', $2)", [cand, `x${i}@example.org`]);
    await db.query("insert into applications (id, vacancy_id, candidate_id, status) values ($1, $2, $3, 'screening')", [app(i), i === 4 ? VAC_B : VAC, cand]);
  }
  await db.query("insert into ats_connections (id, organization_id, provider, enabled, trigger_on, secret_enc, secret_hint) values ($1, $2, 'personio', true, 'interview', 'v1:cipher', '…abcd')", [CONN, ORG]);
});
afterAll(async () => db?.end());

describe("ats handover", () => {
  it("queues once on the configured status, only for the connected customer", async () => {
    await setStatus(1, "shortlisted");
    expect(await transfers()).toEqual([]);
    await setStatus(1, "interview");
    await setStatus(1, "hired");
    await setStatus(4, "interview");
    expect(await transfers()).toEqual([app(1)]);
  });

  it("follows the trigger setting and the switch", async () => {
    await db.query("update ats_connections set trigger_on = 'shortlist'");
    await setStatus(2, "shortlisted");
    await db.query("update ats_connections set trigger_on = 'manual'");
    await setStatus(3, "interview");
    await db.query("update ats_connections set enabled = false, trigger_on = 'interview'");
    await setStatus(3, "hired");
    expect(await transfers()).toEqual([app(1), app(2)]);
  });

  it("hands out pending transfers once per claim and stops after five attempts", async () => {
    const first = (await db.query("select id from claim_ats_transfers(10)")).rows;
    expect(first).toHaveLength(2);
    await db.query("update ats_transfers set attempts = 5 where application_id = $1", [app(1)]);
    const again = (await db.query("select application_id from claim_ats_transfers(10)")).rows;
    expect(again.map((r) => r.application_id)).toEqual([app(2)]);
  });

  it("never shows the encrypted key to signed-in users and allows no direct writes", () =>
    asUser(db, CUSTOMER, async (c) => {
      const r = (await c.query("select provider, secret_hint from ats_connections")).rows;
      expect(r).toEqual([{ provider: "personio", secret_hint: "…abcd" }]);
      expect(await errorOf(c, () => c.query("select secret_enc from ats_connections"))).toMatch(/permission denied/);
      expect(await errorOf(c, () => c.query("update ats_connections set enabled = true"))).toMatch(/permission denied/);
      expect(await errorOf(c, () => c.query("select * from claim_ats_transfers(1)"))).toMatch(/permission denied/);
    }));
});
