// Candidate self-service (0027): withdraw, feedback requests.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const OWNER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
const VAC = "20000000-0000-0000-0000-00000000000a";
const CAND = "40000000-0000-0000-0000-000000000001";
const OTHER = "40000000-0000-0000-0000-000000000002";
const APP = "50000000-0000-0000-0000-000000000001";
const APP2 = "50000000-0000-0000-0000-000000000002";
const SLOT = "60000000-0000-0000-0000-000000000001";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_selfservice_test") });
  await db.connect();
  await db.query("insert into auth.users (id, email) values ($1, 'owner@kunde.de')", [OWNER]);
  await db.query("insert into organizations (id, name) values ($1, 'Kunde')", [ORG]);
  await db.query("insert into customer_members (organization_id, profile_id) values ($1, $2)", [ORG, OWNER]);
  await db.query("insert into vacancies (id, organization_id, title, status) values ($1, $2, 'Busfahrer', 'active')", [VAC, ORG]);
  await db.query("insert into candidates (id, first_name, last_name, email) values ($1, 'Kai', 'K', 'k@example.org'), ($2, 'Lea', 'L', 'l@example.org')", [CAND, OTHER]);
  await db.query("insert into applications (id, vacancy_id, candidate_id, status) values ($1, $3, $4, 'shortlisted'), ($2, $3, $5, 'screening')", [APP, APP2, VAC, CAND, OTHER]);
  await db.query("insert into interview_slots (id, vacancy_id, starts_at) values ($1, $2, now() + interval '3 days')", [SLOT, VAC]);
  await db.query("select book_slot($1, $2)", [APP, SLOT]);
  await db.query("insert into mail_outbox (application_id, candidate_id, to_email, template, data, send_after) values ($1, $2, 'k@example.org', 'interview_reminder', '{}', now() + interval '1 day')", [APP, CAND]);
  await db.query("delete from mail_outbox where template = 'team_booking'");
});
afterAll(async () => db?.end());

describe("withdraw", () => {
  it("only the candidate's own application, frees the slot, stops mails, tells the customer team", async () => {
    expect((await db.query("select withdraw_application($1, $2) as ok", [APP, OTHER])).rows[0].ok).toBe(false);
    expect((await db.query("select withdraw_application($1, $2) as ok", [APP, CAND])).rows[0].ok).toBe(true);
    expect((await db.query("select status from applications where id = $1", [APP])).rows[0].status).toBe("withdrawn");
    expect((await db.query("select count(*)::int as n from interview_bookings where application_id = $1 and cancelled_at is null", [APP])).rows[0].n).toBe(0);
    expect((await db.query("select count(*)::int as n from mail_outbox where application_id = $1 and sent_at is null and cancelled_at is null", [APP])).rows[0].n).toBe(0);
    expect((await db.query("select to_email from mail_outbox where template = 'team_withdrawn'")).rows).toEqual([{ to_email: "owner@kunde.de" }]);
    expect((await db.query("select withdraw_application($1, $2) as ok", [APP, CAND])).rows[0].ok).toBe(false);
  });

  it("is not callable by signed-in users, feedback requests are staff-only", () =>
    asUser(db, OWNER, async (c) => {
      expect(await errorOf(c, () => c.query("select withdraw_application($1, $2)", [APP2, OTHER]))).toMatch(/permission denied/);
      expect((await c.query("select * from feedback_requests")).rows).toEqual([]);
    }));
});

describe("feedback answer template (0029)", () => {
  it("stores a template id and rejects anything else", async () => {
    await db.query("begin");
    try {
      await db.query("insert into feedback_requests (application_id) values ($1) on conflict do nothing", [APP2]);
      await db.query("update feedback_requests set template = 'neutral' where application_id = $1", [APP2]);
      expect((await db.query("select template from feedback_requests where application_id = $1", [APP2])).rows[0].template).toBe("neutral");
      await expect(db.query("update feedback_requests set template = 'Neutral!' where application_id = $1", [APP2])).rejects.toThrow(/check constraint/);
    } finally {
      await db.query("rollback");
    }
  });
});
