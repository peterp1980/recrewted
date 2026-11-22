// Job import (0032): admins manage sources, staff read, customers see nothing.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const RECRUITER = "00000000-0000-0000-0000-0000000000b1";
const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_imports_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1), ($2), ($3)", [ADMIN, RECRUITER, CUSTOMER]);
  await db.query("update profiles set role = 'admin' where id = $1", [ADMIN]);
  await db.query("update profiles set role = 'recruiter' where id = $1", [RECRUITER]);
  await db.query("insert into organizations (id, name) values ($1, 'A')", [ORG]);
  await db.query("insert into customer_members values ($1, $2)", [ORG, CUSTOMER]);
});
afterAll(async () => db?.end());

describe("job imports", () => {
  it("has the switches: customer import on, external jobs off", async () => {
    const { rows } = await db.query("select key, enabled from feature_switches order by key");
    expect(rows).toEqual([{ key: "external_jobs", enabled: false }, { key: "import_customer_jobs", enabled: true }]);
  });

  it("admins add sources; one per provider and handle", () =>
    asUser(db, ADMIN, async (c) => {
      await c.query("insert into job_imports (organization_id, provider, source) values ($1, 'personio', 'hafermann')", [ORG]);
      expect(await errorOf(c, () => c.query("insert into job_imports (organization_id, provider, source) values ($1, 'personio', 'hafermann')", [ORG]))).toMatch(/duplicate key/);
      expect(await errorOf(c, () => c.query("insert into job_imports (organization_id, provider, source) values ($1, 'indeed', 'x')", [ORG]))).toMatch(/check constraint/);
      expect((await c.query("update feature_switches set enabled = true where key = 'external_jobs'")).rowCount).toBe(1);
    }));

  it("recruiters read but cannot change", () =>
    asUser(db, RECRUITER, async (c) => {
      expect(await errorOf(c, () => c.query("insert into job_imports (organization_id, provider, source) values ($1, 'lever', 'a')", [ORG]))).toMatch(/row-level security/);
      expect((await c.query("update feature_switches set enabled = false")).rowCount).toBe(0);
    }));

  it("customers see nothing", async () => {
    await db.query("insert into job_imports (organization_id, provider, source) values ($1, 'greenhouse', 'acme')", [ORG]);
    await asUser(db, CUSTOMER, async (c) => {
      expect((await c.query("select count(*)::int as n from job_imports")).rows[0].n).toBe(0);
      expect((await c.query("select count(*)::int as n from imported_jobs")).rows[0].n).toBe(0);
      expect((await c.query("select count(*)::int as n from feature_switches")).rows[0].n).toBe(0);
    });
  });
});
