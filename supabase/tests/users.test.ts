// User management (0034): deleting accounts keeps the data, last owner rule.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, errorOf } from "./db";

const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const OWNER = "00000000-0000-0000-0000-0000000000c1";
const MEMBER = "00000000-0000-0000-0000-0000000000c2";
const SOLO = "00000000-0000-0000-0000-0000000000c3";
const ORG = "10000000-0000-0000-0000-00000000000a";
const ORG_SOLO = "10000000-0000-0000-0000-00000000000b";
const VAC = "20000000-0000-0000-0000-00000000000a";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_users_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1), ($2), ($3), ($4)", [ADMIN, OWNER, MEMBER, SOLO]);
  await db.query("update profiles set role = 'admin' where id = $1", [ADMIN]);
  await db.query("insert into organizations (id, name) values ($1, 'A'), ($2, 'Solo')", [ORG, ORG_SOLO]);
  await db.query("insert into customer_members (organization_id, profile_id, member_role) values ($1, $2, 'owner'), ($1, $3, 'member'), ($4, $5, 'owner')", [ORG, OWNER, MEMBER, ORG_SOLO, SOLO]);
  await db.query("insert into vacancies (id, organization_id, title, created_by) values ($1, $2, 'Fahrer (m/w/d)', $3)", [VAC, ORG, MEMBER]);
});
afterAll(async () => db?.end());

describe("deleting accounts", () => {
  it("keeps the data the user created, with an empty reference", async () => {
    await db.query("delete from auth.users where id = $1", [MEMBER]);
    expect((await db.query("select created_by from vacancies where id = $1", [VAC])).rows[0].created_by).toBeNull();
    expect((await db.query("select count(*)::int as n from customer_members where profile_id = $1", [MEMBER])).rows[0].n).toBe(0);
  });

  it("no foreign key to profiles blocks a delete any more", async () => {
    const { rows } = await db.query(`select conrelid::regclass::text as t from pg_constraint where contype = 'f' and confrelid = 'public.profiles'::regclass and confdeltype in ('a', 'r')`);
    expect(rows).toEqual([]);
  });

  it("a sole owner may go, the last owner of a team may not", async () => {
    await db.query("delete from auth.users where id = $1", [SOLO]);
    await db.query("insert into auth.users (id) values ($1)", [MEMBER]);
    await db.query("insert into customer_members (organization_id, profile_id, member_role) values ($1, $2, 'member')", [ORG, MEMBER]);
    await db.query("begin");
    try {
      expect(await errorOf(db, () => db.query("delete from auth.users where id = $1", [OWNER]))).toMatch(/last_owner/);
    } finally {
      await db.query("rollback");
    }
  });
});
