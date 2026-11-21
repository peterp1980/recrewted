// F6/F11/F14: customer feedback, hire fills the vacancy, campaigns stop.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
const VAC = "20000000-0000-0000-0000-00000000000a";
const CAMP = "30000000-0000-0000-0000-00000000000a";
const A1 = "50000000-0000-0000-0000-000000000001";
const A2 = "50000000-0000-0000-0000-000000000002";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_portal_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1)", [CUSTOMER]);
  await db.query("insert into organizations (id, name) values ($1, 'A')", [ORG]);
  await db.query("insert into customer_members values ($1, $2)", [ORG, CUSTOMER]);
  await db.query("insert into vacancies (id, organization_id, title, status, salary_min, salary_max) values ($1, $2, 'Job', 'active', 1, 2)", [VAC, ORG]);
  await db.query("insert into campaigns (id, vacancy_id, channel, status) values ($1, $2, 'meta', 'running')", [CAMP, VAC]);
  await db.query("insert into candidates (id, first_name, last_name, email) values ('40000000-0000-0000-0000-000000000001', 'E', 'M', 'e@x.de'), ('40000000-0000-0000-0000-000000000002', 'M', 'M', 'm@x.de')");
  await db.query("insert into applications (id, vacancy_id, candidate_id, status) values ($1, $3, '40000000-0000-0000-0000-000000000001', 'shortlisted'), ($2, $3, '40000000-0000-0000-0000-000000000002', 'screening')", [A1, A2, VAC]);
});
afterAll(async () => db?.end());

const feedback = (c: Client, app: string, verdict: string, reason: string | null = null) =>
  c.query("insert into customer_feedback (application_id, verdict, reason, created_by) values ($1, $2, $3, $4)", [app, verdict, reason, CUSTOMER]);

describe("customer feedback", () => {
  it("moves the application to interview and writes an event", () =>
    asUser(db, CUSTOMER, async (c) => {
      await feedback(c, A1, "interview");
      expect((await c.query("select status from applications where id = $1", [A1])).rows[0].status).toBe("interview");
      await c.query("reset role");
      expect((await c.query("select props from events where name = 'customer_feedback' and application_id = $1", [A1])).rows[0].props).toEqual({ verdict: "interview" });
    }));

  it("needs a reason for 'no fit' and 'rejected'", () =>
    asUser(db, CUSTOMER, async (c) => {
      expect(await errorOf(c, () => feedback(c, A1, "rejected"))).toMatch(/reason_required/);
      expect(await errorOf(c, () => feedback(c, A1, "no_fit", "  "))).toMatch(/reason_required/);
      expect(await errorOf(c, () => feedback(c, A1, "no_fit", "Gehaltsvorstellung zu hoch"))).toBeNull();
      expect((await c.query("select status from applications where id = $1", [A1])).rows[0].status).toBe("shortlisted");
    }));

  it("cannot give feedback on applicants outside the shortlist", () =>
    asUser(db, CUSTOMER, async (c) => {
      expect(await errorOf(c, () => feedback(c, A2, "hired"))).toMatch(/row-level security/);
    }));

  it("a hire fills the vacancy and ends its campaigns (F11)", () =>
    asUser(db, CUSTOMER, async (c) => {
      await feedback(c, A1, "hired");
      await c.query("reset role");
      expect((await c.query("select status, filled_at is not null as f from vacancies where id = $1", [VAC])).rows[0]).toEqual({ status: "filled", f: true });
      expect((await c.query("select status from campaigns where id = $1", [CAMP])).rows[0].status).toBe("ended");
      expect((await c.query("select name from events where application_id = $1 and name = 'hired'", [A1])).rows).toHaveLength(1);
    }));

  it("keeps the vacancy open while openings remain", async () => {
    await db.query("begin");
    try {
      await db.query("update vacancies set openings = 2 where id = $1", [VAC]);
      await db.query("update applications set status = 'hired' where id = $1", [A1]);
      expect((await db.query("select status from vacancies where id = $1", [VAC])).rows[0].status).toBe("active");
      await db.query("update vacancies set status = 'paused' where id = $1", [VAC]);
      expect((await db.query("select status from campaigns where id = $1", [CAMP])).rows[0].status).toBe("paused");
    } finally {
      await db.query("rollback");
    }
  });
});
