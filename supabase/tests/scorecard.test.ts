// F4: weighted score kept by the database, rater stamped, status changes write events.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const RECRUITER = "00000000-0000-0000-0000-0000000000a2";
const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
const VAC = "20000000-0000-0000-0000-00000000000a";
const CAND = "40000000-0000-0000-0000-000000000001";
const APP = "50000000-0000-0000-0000-000000000001";
const C1 = "60000000-0000-0000-0000-000000000001";
const C2 = "60000000-0000-0000-0000-000000000002";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_scorecard_test") });
  await db.connect();
  for (const id of [RECRUITER, CUSTOMER]) await db.query("insert into auth.users (id) values ($1)", [id]);
  await db.query("update profiles set role = 'recruiter' where id = $1", [RECRUITER]);
  await db.query("insert into organizations (id, name) values ($1, 'A')", [ORG]);
  await db.query("insert into customer_members values ($1, $2)", [ORG, CUSTOMER]);
  await db.query("insert into vacancies (id, organization_id, title, status, salary_min, salary_max) values ($1, $2, 'Job', 'active', 1, 2)", [VAC, ORG]);
  await db.query("insert into scorecard_criteria (id, vacancy_id, position, name, weight) values ($1, $3, 1, 'Ausbildung', 2), ($2, $3, 2, 'Motivation', 1)", [C1, C2, VAC]);
  await db.query("insert into candidates (id, first_name, last_name, email) values ($1, 'Eva', 'M', 'e@x.de')", [CAND]);
  await db.query("insert into applications (id, vacancy_id, candidate_id, status) values ($1, $2, $3, 'screening')", [APP, VAC, CAND]);
  await db.query("insert into application_attribution (application_id, entry_point, channel) values ($1, 'jobboard', 'meta')", [APP]);
});
afterAll(async () => db?.end());

const score = async (c: Client) => (await c.query("select score from applications where id = $1", [APP])).rows[0].score;

describe("scorecard", () => {
  it("computes the weighted mean and follows changes", () =>
    asUser(db, RECRUITER, async (c) => {
      await c.query("insert into scorecard_ratings (application_id, criterion_id, rating, reason) values ($1, $2, 5, 'IHK-Abschluss')", [APP, C1]);
      expect(await score(c)).toBe("5.00");
      await c.query("insert into scorecard_ratings (application_id, criterion_id, rating, reason) values ($1, $2, 2, 'wenig konkret')", [APP, C2]);
      expect(await score(c)).toBe("4.00"); // (5*2 + 2*1) / 3
      await c.query("update scorecard_criteria set weight = 1 where id = $1", [C1]);
      expect(await score(c)).toBe("3.50");
      await c.query("reset role");
      await c.query("delete from scorecard_ratings where criterion_id = $1", [C2]);
      expect(await score(c)).toBe("5.00");
    }));

  it("stamps the rater and ignores a forged rated_by", () =>
    asUser(db, RECRUITER, async (c) => {
      await c.query("insert into scorecard_ratings (application_id, criterion_id, rating, rated_by) values ($1, $2, 3, $3)", [APP, C1, CUSTOMER]);
      expect((await c.query("select rated_by from scorecard_ratings where criterion_id = $1", [C1])).rows[0].rated_by).toBe(RECRUITER);
    }));

  it("does not let customers rate", () =>
    asUser(db, CUSTOMER, async (c) => {
      expect(await errorOf(c, () => c.query("insert into scorecard_ratings (application_id, criterion_id, rating) values ($1, $2, 5)", [APP, C1]))).toMatch(/row-level security/);
    }));
});

describe("status events", () => {
  it("writes funnel events with the application's origin and closes rejected applications", () =>
    asUser(db, RECRUITER, async (c) => {
      await c.query("update applications set status = 'qualified' where id = $1", [APP]);
      await c.query("update applications set status = 'shortlisted' where id = $1", [APP]);
      await c.query("update applications set status = 'rejected' where id = $1", [APP]);
      await c.query("reset role");
      const evs = (await c.query("select name, channel, entry_point, props from events where application_id = $1 order by id", [APP])).rows;
      expect(evs.map((e) => e.name)).toEqual(["qualified", "shortlisted", "withdrawn_or_rejected"]);
      expect(evs[0]).toMatchObject({ channel: "meta", entry_point: "jobboard", props: { from: "screening" } });
      expect((await c.query("select closed_at is not null as closed, shortlisted_at is not null as sl from applications where id = $1", [APP])).rows[0]).toEqual({ closed: true, sl: true });
    }));

  it("writes nothing when the status does not change", () =>
    asUser(db, RECRUITER, async (c) => {
      await c.query("update applications set score = score where id = $1", [APP]);
      await c.query("reset role");
      expect(Number((await c.query("select count(*) from events where application_id = $1", [APP])).rows[0].count)).toBe(0);
    }));
});
