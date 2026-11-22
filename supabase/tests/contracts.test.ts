// F16 contracts (0030): admins only write, customers read their own, templates per kind.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const RECRUITER = "00000000-0000-0000-0000-0000000000b1";
const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const OTHER = "00000000-0000-0000-0000-0000000000c2";
const ORG = "10000000-0000-0000-0000-00000000000a";
const ORG_B = "10000000-0000-0000-0000-00000000000b";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_contracts_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1), ($2), ($3), ($4)", [ADMIN, RECRUITER, CUSTOMER, OTHER]);
  await db.query("update profiles set role = 'admin' where id = $1", [ADMIN]);
  await db.query("update profiles set role = 'recruiter' where id = $1", [RECRUITER]);
  await db.query("insert into organizations (id, name) values ($1, 'A'), ($2, 'B')", [ORG, ORG_B]);
  await db.query("insert into customer_members values ($1, $2), ($3, $4)", [ORG, CUSTOMER, ORG_B, OTHER]);
});
afterAll(async () => db?.end());

describe("contracts", () => {
  it("admins create framework contracts", () =>
    asUser(db, ADMIN, async (c) => {
      await c.query("insert into contracts (organization_id, kind, template_version, name, recipient_email) values ($1, 'framework', '1', 'Rahmenvertrag', 'chefin@a.de')", [ORG]);
      expect((await c.query("select count(*)::int as n from contracts")).rows[0].n).toBe(1);
    }));

  it("recruiters can read but not write", () =>
    asUser(db, RECRUITER, async (c) => {
      expect(await errorOf(c, () => c.query("insert into contracts (organization_id, kind, template_version) values ($1, 'offer', '1')", [ORG]))).toMatch(/row-level security/);
    }));

  it("customers read only their own", async () => {
    await db.query("insert into contracts (organization_id, kind, template_version) values ($1, 'offer', '1'), ($2, 'offer', '1')", [ORG, ORG_B]);
    await asUser(db, CUSTOMER, async (c) => {
      expect((await c.query("select organization_id from contracts")).rows.every((r) => r.organization_id === ORG)).toBe(true);
      const r = await c.query("update contracts set status = 'completed'");
      expect(r.rowCount).toBe(0);
    });
  });

  it("keeps one active template per kind", () =>
    asUser(db, ADMIN, async (c) => {
      await c.query("insert into contract_templates (kind, name, pandadoc_template_id) values ('offer', 'Angebot 2026', 'AbCdEf1234567890')");
      expect(await errorOf(c, () => c.query("insert into contract_templates (kind, name, pandadoc_template_id) values ('offer', 'Angebot neu', 'XyZ1234567890abc')"))).toMatch(/duplicate key/);
      expect(await errorOf(c, () => c.query("insert into contract_templates (kind, name, pandadoc_template_id) values ('dpa', 'AV', 'bad id!')"))).toMatch(/check constraint/);
    }));

  it("templates are not visible to customers", () =>
    asUser(db, CUSTOMER, async (c) => {
      expect((await c.query("select count(*)::int as n from contract_templates")).rows[0].n).toBe(0);
    }));
});
