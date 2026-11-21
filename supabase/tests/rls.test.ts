// Access rules per role (Lastenheft F17, section 1).
// Runs against a real Postgres with all migrations applied: npm run test:db
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const U = {
  admin: "00000000-0000-0000-0000-0000000000a1",
  recruiter: "00000000-0000-0000-0000-0000000000a2",
  customerA: "00000000-0000-0000-0000-0000000000c1",
  customerB: "00000000-0000-0000-0000-0000000000c2",
};
const ORG_A = "10000000-0000-0000-0000-00000000000a";
const ORG_B = "10000000-0000-0000-0000-00000000000b";
const VAC_A = "20000000-0000-0000-0000-00000000000a"; // active, org A
const VAC_A_DRAFT = "20000000-0000-0000-0000-0000000000ad"; // draft, org A
const VAC_B = "20000000-0000-0000-0000-00000000000b"; // active, org B
const CAMPAIGN_A = "30000000-0000-0000-0000-00000000000a";
const CAND_SCREENING = "40000000-0000-0000-0000-000000000001";
const CAND_SHORTLISTED = "40000000-0000-0000-0000-000000000002";
const CAND_B = "40000000-0000-0000-0000-000000000003";
const APP_SCREENING = "50000000-0000-0000-0000-000000000001";
const APP_SHORTLISTED = "50000000-0000-0000-0000-000000000002";
const APP_B = "50000000-0000-0000-0000-000000000003";
const CRIT_A = "60000000-0000-0000-0000-00000000000a";

let db: Client;

const count = async (c: Client, sql: string, params: unknown[] = []) =>
  Number((await c.query(`select count(*)::int as n from (${sql}) x`, params)).rows[0].n);

beforeAll(async () => {
  const url = await createTestDatabase("recrewted_rls_test");
  db = new Client({ connectionString: url });
  await db.connect();

  // Seed as superuser (bypasses RLS). Profiles come from the auth trigger.
  for (const id of Object.values(U)) await db.query("insert into auth.users (id) values ($1)", [id]);
  await db.query("update profiles set role = 'admin' where id = $1", [U.admin]);
  await db.query("update profiles set role = 'recruiter' where id = $1", [U.recruiter]);
  await db.query(`insert into organizations (id, name) values ($1, 'Org A'), ($2, 'Org B')`, [ORG_A, ORG_B]);
  await db.query(`insert into customer_members values ($1, $2), ($3, $4)`, [ORG_A, U.customerA, ORG_B, U.customerB]);
  await db.query(
    `insert into vacancies (id, organization_id, title, status, salary_min, salary_max, pricing_model) values
      ($1, $4, 'Job A', 'active', 40000, 50000, 'fixed_pro'),
      ($2, $4, 'Job A draft', 'draft', null, null, null),
      ($3, $5, 'Job B', 'active', 40000, 50000, 'fixed_pro')`,
    [VAC_A, VAC_A_DRAFT, VAC_B, ORG_A, ORG_B],
  );
  await db.query(`insert into contracts (organization_id, vacancy_id, kind, template_version) values ($1, $2, 'offer', 'v1'), ($3, $4, 'offer', 'v1')`, [ORG_A, VAC_A, ORG_B, VAC_B]);
  await db.query(`insert into campaigns (id, vacancy_id, channel, budget_eur) values ($1, $2, 'meta', 1500)`, [CAMPAIGN_A, VAC_A]);
  await db.query(`insert into ad_costs values ($1, '2026-11-01', 123.45, 1000, 50)`, [CAMPAIGN_A]);
  await db.query(`insert into scorecard_criteria (id, vacancy_id, position, name) values ($1, $2, 1, 'Erfahrung')`, [CRIT_A, VAC_A]);
  await db.query(
    `insert into candidates (id, first_name, last_name, email) values
      ($1, 'Max', 'Muster', 'max@example.org'), ($2, 'Eva', 'Beispiel', 'eva@example.org'), ($3, 'Bea', 'B', 'bea@example.org')`,
    [CAND_SCREENING, CAND_SHORTLISTED, CAND_B],
  );
  await db.query(
    `insert into applications (id, vacancy_id, candidate_id, status) values
      ($1, $4, $5, 'screening'), ($2, $4, $6, 'shortlisted'), ($3, $7, $8, 'shortlisted')`,
    [APP_SCREENING, APP_SHORTLISTED, APP_B, VAC_A, CAND_SCREENING, CAND_SHORTLISTED, VAC_B, CAND_B],
  );
  await db.query(`insert into scorecard_ratings (application_id, criterion_id, rating) values ($1, $3, 4), ($2, $3, 2)`, [APP_SHORTLISTED, APP_SCREENING, CRIT_A]);
  await db.query(`insert into events (name, vacancy_id) values ('apply_submit', $1)`, [VAC_A]);
  await db.query(`insert into audit_log (action, table_name) values ('read', 'candidates')`);
});

afterAll(async () => {
  await db?.end();
});

describe("new users", () => {
  it("get a customer profile automatically", async () => {
    const id = "00000000-0000-0000-0000-0000000000ff";
    await db.query("begin");
    await db.query("insert into auth.users (id, raw_user_meta_data) values ($1, $2)", [id, { full_name: "Neu" }]);
    const { rows } = await db.query("select role, full_name from profiles where id = $1", [id]);
    await db.query("rollback");
    expect(rows[0]).toEqual({ role: "customer", full_name: "Neu" });
  });
});

describe("customer", () => {
  const as = <T>(fn: (c: Client) => Promise<T>) => asUser(db, U.customerA, fn);

  it("sees only the own organization and its vacancies", () =>
    as(async (c) => {
      expect(await count(c, "select * from organizations")).toBe(1);
      expect(await count(c, "select * from vacancies where organization_id = $1", [ORG_A])).toBe(2);
      expect(await count(c, "select * from vacancies where organization_id = $1", [ORG_B])).toBe(0);
      expect(await count(c, "select * from contracts")).toBe(1);
    }));

  it("can create a draft vacancy only in the own organization", () =>
    as(async (c) => {
      expect(await errorOf(c, () => c.query("insert into vacancies (organization_id, title) values ($1, 'x')", [ORG_A]))).toBeNull();
      expect(await errorOf(c, () => c.query("insert into vacancies (organization_id, title) values ($1, 'x')", [ORG_B]))).toMatch(/row-level security/);
      expect(
        await errorOf(c, () =>
          c.query("insert into vacancies (organization_id, title, status, salary_min, salary_max) values ($1, 'x', 'active', 1, 2)", [ORG_A]),
        ),
      ).toMatch(/row-level security/);
    }));

  it("cannot change a vacancy directly", () =>
    as(async (c) => {
      const r = await c.query("update vacancies set status = 'filled' where id = $1", [VAC_A]);
      expect(r.rowCount).toBe(0);
    }));

  it("can edit the briefing until the contract is signed", () =>
    as(async (c) => {
      expect(await errorOf(c, () => c.query("insert into vacancy_briefings (vacancy_id, data) values ($1, '{}')", [VAC_A_DRAFT]))).toBeNull();
      expect(await errorOf(c, () => c.query("insert into vacancy_briefings (vacancy_id, data) values ($1, '{}')", [VAC_A]))).toMatch(/row-level security/);
    }));

  it("sees applicants only from the shortlist on", () =>
    as(async (c) => {
      expect((await c.query("select id from applications")).rows.map((r) => r.id)).toEqual([APP_SHORTLISTED]);
      expect((await c.query("select id from candidates")).rows.map((r) => r.id)).toEqual([CAND_SHORTLISTED]);
      expect(await count(c, "select * from scorecard_ratings")).toBe(1);
    }));

  it("keeps seeing a shortlisted applicant and the own feedback after rejecting", async () => {
    await db.query("begin");
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [U.customerA]);
    await db.query("insert into customer_feedback (application_id, verdict, reason, created_by) values ($1, 'no_fit', 'Gehalt', $2)", [APP_SHORTLISTED, U.customerA]);
    await db.query("reset role");
    await db.query("update applications set status = 'rejected' where id = $1", [APP_SHORTLISTED]);
    await db.query("set local role authenticated");
    expect(await count(db, "select * from applications")).toBe(1);
    expect(await count(db, "select * from customer_feedback")).toBe(1);
    await db.query("rollback");
  });

  it("gives feedback only on own shortlisted applicants and in the own name", () =>
    as(async (c) => {
      const ins = (app: string, by: string) =>
        errorOf(c, () => c.query("insert into customer_feedback (application_id, verdict, created_by) values ($1, 'fit', $2)", [app, by]));
      expect(await ins(APP_SHORTLISTED, U.customerA)).toBeNull();
      expect(await ins(APP_SCREENING, U.customerA)).toMatch(/row-level security/);
      expect(await ins(APP_B, U.customerA)).toMatch(/row-level security/);
      expect(await ins(APP_SHORTLISTED, U.customerB)).toMatch(/row-level security/);
    }));

  it("does not see media budget or costs (margin)", () =>
    as(async (c) => {
      expect(await count(c, "select * from campaigns")).toBe(0);
      expect(await count(c, "select * from ad_costs")).toBe(0);
    }));

  it("does not see internal tables", () =>
    as(async (c) => {
      for (const t of ["events", "consents", "ai_recommendations", "audit_log", "application_attribution"]) {
        expect(await count(c, `select * from ${t}`), t).toBe(0);
      }
    }));

  it("cannot read other profiles or raise the own role", () =>
    as(async (c) => {
      expect(await count(c, "select * from profiles")).toBe(1);
      const r = await c.query("update profiles set role = 'admin' where id = $1", [U.customerA]);
      expect(r.rowCount).toBe(0);
    }));
});

describe("recruiter", () => {
  const as = <T>(fn: (c: Client) => Promise<T>) => asUser(db, U.recruiter, fn);

  it("reads and edits recruiting data of all customers", () =>
    as(async (c) => {
      expect(await count(c, "select * from applications")).toBe(3);
      expect(await count(c, "select * from ad_costs")).toBe(1);
      const r = await c.query("update applications set status = 'qualified' where id = $1", [APP_SCREENING]);
      expect(r.rowCount).toBe(1);
    }));

  it("cannot delete", () =>
    as(async (c) => {
      expect((await c.query("delete from candidates where id = $1", [CAND_SCREENING])).rowCount).toBe(0);
      expect((await c.query("delete from vacancies where id = $1", [VAC_A])).rowCount).toBe(0);
    }));

  it("cannot manage customers or users", () =>
    as(async (c) => {
      expect(await errorOf(c, () => c.query("insert into customer_members values ($1, $2)", [ORG_B, U.customerA]))).toMatch(/row-level security/);
      expect(await errorOf(c, () => c.query("insert into organizations (name) values ('x')"))).toMatch(/row-level security/);
      expect((await c.query("update profiles set role = 'admin' where id = $1", [U.recruiter])).rowCount).toBe(0);
    }));

  it("cannot read the audit log", () => as(async (c) => expect(await count(c, "select * from audit_log")).toBe(0)));
});

describe("admin", () => {
  const as = <T>(fn: (c: Client) => Promise<T>) => asUser(db, U.admin, fn);

  it("can delete, manage users and read the audit log", () =>
    as(async (c) => {
      expect((await c.query("delete from candidates where id = $1", [CAND_SCREENING])).rowCount).toBe(1);
      expect(await errorOf(c, () => c.query("insert into customer_members values ($1, $2)", [ORG_B, U.customerA]))).toBeNull();
      expect((await c.query("update profiles set role = 'recruiter' where id = $1", [U.customerB])).rowCount).toBe(1);
      expect(await count(c, "select * from audit_log")).toBe(1);
    }));
});

describe("anonymous", () => {
  const as = <T>(fn: (c: Client) => Promise<T>) => asUser(db, null, fn, "anon");

  it("sees no data", () =>
    as(async (c) => {
      for (const t of ["vacancies", "candidates", "applications", "profiles", "organizations"]) {
        expect(await count(c, `select * from ${t}`), t).toBe(0);
      }
    }));

  it("cannot call the RLS helper functions", () =>
    as(async (c) => {
      expect(await errorOf(c, () => c.query("select private.customer_can_see_application($1)", [APP_SHORTLISTED]))).toMatch(/permission denied/);
    }));
});

describe("application timestamps", () => {
  it("are set when the status reaches shortlist and hire", async () => {
    await db.query("begin");
    await db.query("update applications set status = 'hired' where id = $1", [APP_SCREENING]);
    const { rows } = await db.query("select shortlisted_at, hired_at from applications where id = $1", [APP_SCREENING]);
    await db.query("rollback");
    expect(rows[0].shortlisted_at).not.toBeNull();
    expect(rows[0].hired_at).not.toBeNull();
  });
});
