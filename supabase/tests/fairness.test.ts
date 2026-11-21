// Blind review, pay transparency data, feedback reminders, candidate survey (0026).
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase } from "./db";

const OWNER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
const VAC = "20000000-0000-0000-0000-00000000000a";
const app = (i: number) => `50000000-0000-0000-0000-00000000000${i}`;
const cand = (i: number) => `40000000-0000-0000-0000-00000000000${i}`;
let db: Client;

const mails = async (template: string) => (await db.query("select to_email, data from mail_outbox where template = $1 order by created_at", [template])).rows;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_fairness_test") });
  await db.connect();
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'owner@kunde.de', '{\"full_name\":\"Olaf Owner\"}')", [OWNER]);
  await db.query("insert into organizations (id, name, blind_review) values ($1, 'Kunde', true)", [ORG]);
  await db.query("insert into customer_members (organization_id, profile_id) values ($1, $2)", [ORG, OWNER]);
  await db.query("insert into vacancies (id, organization_id, title, status, salary_note) values ($1, $2, 'Busfahrer', 'active', '3.200–3.600 € brutto im Monat')", [VAC, ORG]);
  for (let i = 1; i <= 3; i++) {
    await db.query("insert into candidates (id, first_name, last_name, email) values ($1, 'Kai', $2, $3)", [cand(i), `K${i}`, `k${i}@example.org`]);
    await db.query("insert into applications (id, vacancy_id, candidate_id, status) values ($1, $2, $3, 'shortlisted')", [app(i), VAC, cand(i)]);
  }
});
afterAll(async () => db?.end());

describe("blind review", () => {
  it("hides identity from the customer until they want to meet the candidate", async () => {
    await asUser(db, OWNER, async (c) => {
      expect((await c.query("select count(*)::int as n from applications")).rows[0].n).toBe(3);
      expect((await c.query("select * from candidates")).rows).toEqual([]);
    });
    await db.query("update applications set status = 'interview' where id = $1", [app(1)]);
    await asUser(db, OWNER, async (c) => {
      expect((await c.query("select last_name from candidates")).rows).toEqual([{ last_name: "K1" }]);
    });
    await db.query("update organizations set blind_review = false");
    await asUser(db, OWNER, async (c) => {
      expect((await c.query("select count(*)::int as n from candidates")).rows[0].n).toBe(3);
    });
    await db.query("update organizations set blind_review = true");
  });
});

describe("feedback reminders", () => {
  it("reminds once per vacancy for shortlisted candidates without feedback", async () => {
    await db.query("update applications set shortlisted_at = now() - interval '4 days' where id in ($1, $2)", [app(2), app(3)]);
    await db.query("delete from mail_outbox");
    const weekday = (await db.query("select extract(isodow from now() at time zone 'Europe/Berlin') <= 5 as w")).rows[0].w;
    const n = (await db.query("select queue_feedback_reminders() as n")).rows[0].n;
    if (!weekday) return expect(n).toBe(0);
    expect(n).toBe(1);
    expect((await mails("feedback_reminder"))[0].data).toMatchObject({ jobTitle: "Busfahrer", open: 2 });
    expect((await db.query("select queue_feedback_reminders() as n")).rows[0].n).toBe(0);
  });
});

describe("candidate survey", () => {
  it("invites once after the final decision and aggregates only from five answers", async () => {
    await db.query("delete from mail_outbox");
    await db.query("update applications set status = 'rejected' where id = $1", [app(2)]);
    // A later change (e.g. a correction to "hired") does not send a second survey.
    await db.query("update applications set status = 'hired' where id = $1", [app(2)]);
    expect((await mails("candidate_survey")).map((m) => m.to_email)).toEqual(["k2@example.org"]);
    await db.query("update candidate_surveys set score = 4, answered_at = now()");
    await asUser(db, OWNER, async (c) => {
      expect((await c.query("select * from candidate_experience($1)", [ORG])).rows).toEqual([]);
      expect((await c.query("select * from candidate_surveys")).rows).toEqual([]);
    });
  });
});
