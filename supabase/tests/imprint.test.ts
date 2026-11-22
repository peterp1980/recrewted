// Customer imprint on own career domains (0028).
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_imprint_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1), ($2)", [ADMIN, CUSTOMER]);
  await db.query("update profiles set role = 'admin' where id = $1", [ADMIN]);
  await db.query("insert into organizations (id, name, career_domain) values ($1, 'A', 'karriere.a-gmbh.de')", [ORG]);
  await db.query("insert into customer_members values ($1, $2)", [ORG, CUSTOMER]);
});
afterAll(async () => db?.end());

describe("customer imprint", () => {
  it("checks imprint text and link", () =>
    asUser(db, ADMIN, async (c) => {
      expect(await errorOf(c, () => c.query("update organizations set imprint = 'zu kurz' where id = $1", [ORG]))).toMatch(/check constraint/);
      expect(await errorOf(c, () => c.query("update organizations set imprint_url = 'http://a-gmbh.de/impressum' where id = $1", [ORG]))).toMatch(/check constraint/);
      await c.query("update organizations set imprint = $2, imprint_url = 'https://a-gmbh.de/impressum' where id = $1", [ORG, "A GmbH, Musterstraße 1, 80331 München. Vertreten durch Max Muster."]);
    }));

  it("forgets the verification when the domain changes, not on other edits", async () => {
    await db.query("update organizations set career_domain_verified_at = now() where id = $1", [ORG]);
    await db.query("update organizations set name = 'A GmbH' where id = $1", [ORG]);
    expect((await db.query("select career_domain_verified_at from organizations where id = $1", [ORG])).rows[0].career_domain_verified_at).not.toBeNull();
    await db.query("update organizations set career_domain = 'jobs.a-gmbh.de' where id = $1", [ORG]);
    expect((await db.query("select career_domain_verified_at from organizations where id = $1", [ORG])).rows[0].career_domain_verified_at).toBeNull();
  });

  it("customers cannot change it", () =>
    asUser(db, CUSTOMER, async (c) => {
      const r = await c.query("update organizations set imprint = $2, career_domain_verified_at = now() where id = $1", [ORG, "x".repeat(40)]);
      expect(r.rowCount).toBe(0);
    }));
});
