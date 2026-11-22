// F9 job channels (0031): admins switch channels globally and per customer.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const RECRUITER = "00000000-0000-0000-0000-0000000000b1";
const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_channels_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1), ($2), ($3)", [ADMIN, RECRUITER, CUSTOMER]);
  await db.query("update profiles set role = 'admin' where id = $1", [ADMIN]);
  await db.query("update profiles set role = 'recruiter' where id = $1", [RECRUITER]);
  await db.query("insert into organizations (id, name) values ($1, 'A')", [ORG]);
  await db.query("insert into customer_members values ($1, $2)", [ORG, CUSTOMER]);
});
afterAll(async () => db?.end());

describe("job channels", () => {
  it("starts with Google and Indeed on, new aggregators off", async () => {
    const { rows } = await db.query("select key, enabled from job_channels order by key");
    expect(rows.find((r) => r.key === "google")?.enabled).toBe(true);
    expect(rows.find((r) => r.key === "jooble")?.enabled).toBe(false);
  });

  it("admins switch channels globally and per customer", () =>
    asUser(db, ADMIN, async (c) => {
      expect((await c.query("update job_channels set enabled = true where key = 'jooble'")).rowCount).toBe(1);
      await c.query("insert into organization_channels (organization_id, channel, enabled) values ($1, 'indeed', false)", [ORG]);
      expect(await errorOf(c, () => c.query("insert into organization_channels (organization_id, channel, enabled) values ($1, 'myspace', false)", [ORG]))).toMatch(/foreign key/);
    }));

  it("recruiters read but cannot switch", () =>
    asUser(db, RECRUITER, async (c) => {
      expect((await c.query("select count(*)::int as n from job_channels")).rows[0].n).toBe(10);
      expect((await c.query("update job_channels set enabled = false")).rowCount).toBe(0);
      expect(await errorOf(c, () => c.query("insert into organization_channels (organization_id, channel, enabled) values ($1, 'google', false)", [ORG]))).toMatch(/row-level security/);
    }));

  it("customers see nothing of it", () =>
    asUser(db, CUSTOMER, async (c) => {
      expect((await c.query("select count(*)::int as n from job_channels")).rows[0].n).toBe(0);
      expect((await c.query("select count(*)::int as n from organization_channels")).rows[0].n).toBe(0);
    }));
});
