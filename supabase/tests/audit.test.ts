// F19: changes to applicant data, ratings and contracts are logged with actor;
// the log is append-only and readable by admins only.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase } from "./db";

const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const RECRUITER = "00000000-0000-0000-0000-0000000000a2";
const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
const VAC = "20000000-0000-0000-0000-00000000000a";
const CAND = "40000000-0000-0000-0000-000000000001";
const APP = "50000000-0000-0000-0000-000000000001";
const CRIT = "60000000-0000-0000-0000-00000000000a";

let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_audit_test") });
  await db.connect();
  for (const id of [ADMIN, RECRUITER, CUSTOMER]) await db.query("insert into auth.users (id) values ($1)", [id]);
  await db.query("update profiles set role = 'admin' where id = $1", [ADMIN]);
  await db.query("update profiles set role = 'recruiter' where id = $1", [RECRUITER]);
  await db.query("insert into organizations (id, name) values ($1, 'Org')", [ORG]);
  await db.query("insert into customer_members values ($1, $2)", [ORG, CUSTOMER]);
  await db.query("insert into vacancies (id, organization_id, title) values ($1, $2, 'Job')", [VAC, ORG]);
  await db.query("insert into scorecard_criteria (id, vacancy_id, position, name) values ($1, $2, 1, 'Erfahrung')", [CRIT, VAC]);
  await db.query("insert into candidates (id, first_name, last_name, email) values ($1, 'Max', 'Muster', 'max@example.org')", [CAND]);
  await db.query("insert into applications (id, vacancy_id, candidate_id, status) values ($1, $2, $3, 'screening')", [APP, VAC, CAND]);
  await db.query("delete from audit_log");
});

afterAll(async () => {
  await db?.end();
});

const lastEntry = async (c: Client, table?: string) =>
  (await c.query(`select actor, action, table_name, record_id, details from audit_log ${table ? "where table_name = $1" : ""} order by id desc limit 1`, table ? [table] : [])).rows[0];

describe("audit log", () => {
  it("records status changes with actor and transition", () =>
    asUser(db, RECRUITER, async (c) => {
      await c.query("update applications set status = 'qualified' where id = $1", [APP]);
      await c.query("reset role");
      expect(await lastEntry(c)).toMatchObject({
        actor: RECRUITER,
        action: "update",
        table_name: "applications",
        record_id: APP,
        details: { columns: ["status"], status: { from: "screening", to: "qualified" } },
      });
    }));

  it("records ratings against the application, without the reason text", () =>
    asUser(db, RECRUITER, async (c) => {
      await c.query("insert into scorecard_ratings (application_id, criterion_id, rating, reason) values ($1, $2, 4, 'sehr gut')", [APP, CRIT]);
      await c.query("update scorecard_ratings set rating = 5 where application_id = $1", [APP]);
      await c.query("reset role");
      const e = await lastEntry(c, "scorecard_ratings");
      expect(e).toMatchObject({ action: "update", table_name: "scorecard_ratings", record_id: APP });
      expect(e.details).toMatchObject({ rating: { from: 4, to: 5 }, criterion_id: CRIT });
      expect(JSON.stringify(e.details)).not.toContain("sehr gut");
    }));

  it("records changes to candidates without personal content", () =>
    asUser(db, RECRUITER, async (c) => {
      await c.query("update candidates set email = 'neu@example.org' where id = $1", [CAND]);
      await c.query("reset role");
      const e = await lastEntry(c);
      expect(e).toMatchObject({ action: "update", table_name: "candidates", record_id: CAND, details: { columns: ["email"] } });
      expect(JSON.stringify(e.details)).not.toContain("example.org");
    }));

  it("records deletions", () =>
    asUser(db, ADMIN, async (c) => {
      await c.query("delete from candidates where id = $1", [CAND]);
      await c.query("reset role");
      const actions = (await c.query("select table_name, action from audit_log where action = 'delete' order by id")).rows;
      expect(actions).toEqual(expect.arrayContaining([{ table_name: "candidates", action: "delete" }, { table_name: "applications", action: "delete" }]));
    }));

  it("skips updates that change nothing", () =>
    asUser(db, RECRUITER, async (c) => {
      await c.query("reset role");
      const before = Number((await c.query("select count(*) from audit_log")).rows[0].count);
      await c.query("set local role authenticated");
      await c.query("update applications set status = status where id = $1", [APP]);
      await c.query("reset role");
      expect(Number((await c.query("select count(*) from audit_log")).rows[0].count)).toBe(before);
    }));

  it("is append-only and readable by admins only", async () => {
    await db.query("insert into audit_log (action, table_name) values ('read', 'candidates')");
    await asUser(db, ADMIN, async (c) => {
      expect(Number((await c.query("select count(*) from audit_log")).rows[0].count)).toBeGreaterThan(0);
      expect((await c.query("delete from audit_log")).rowCount).toBe(0);
      expect((await c.query("update audit_log set action = 'x'")).rowCount).toBe(0);
    });
    await asUser(db, RECRUITER, async (c) => expect(Number((await c.query("select count(*) from audit_log")).rows[0].count)).toBe(0));
    await asUser(db, CUSTOMER, async (c) => expect(Number((await c.query("select count(*) from audit_log")).rows[0].count)).toBe(0));
  });
});
