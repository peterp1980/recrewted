// Status mails (0019): queued by trigger, cancelled on quick corrections, reminders after 7 days.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "./db";

const ORG = "10000000-0000-0000-0000-00000000000a";
const VAC = "20000000-0000-0000-0000-00000000000a";
const CAND = "40000000-0000-0000-0000-000000000001";
const APP = "50000000-0000-0000-0000-000000000001";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_status_mail_test") });
  await db.connect();
  await db.query("insert into organizations (id, name, candidate_tone) values ($1, 'Hafermann Reisen', 'sie')", [ORG]);
  await db.query("insert into vacancies (id, organization_id, title, status) values ($1, $2, 'Busfahrer:in (m/w/d)', 'active')", [VAC, ORG]);
  await db.query("insert into candidates (id, first_name, last_name, email) values ($1, 'Eva', 'M', 'eva@example.org')", [CAND]);
  await db.query("insert into applications (id, vacancy_id, candidate_id, status) values ($1, $2, $3, 'screening')", [APP, VAC, CAND]);
});
afterAll(async () => db?.end());

const tx = async (fn: () => Promise<void>) => { await db.query("begin"); try { await fn(); } finally { await db.query("rollback"); } };
const pending = async () => (await db.query("select data ->> 'status' as s from mail_outbox where application_id = $1 and template = 'status_update' and cancelled_at is null", [APP])).rows.map((r) => r.s);

describe("status mails", () => {
  it("queues a mail with job, employer and tone, ten minutes later", () =>
    tx(async () => {
      await db.query("update applications set status = 'shortlisted' where id = $1", [APP]);
      const m = (await db.query("select to_email, data, send_after > now() + interval '9 minutes' as later from mail_outbox where application_id = $1 and template = 'status_update'", [APP])).rows[0];
      expect(m).toMatchObject({ to_email: "eva@example.org", later: true, data: { status: "shortlisted", firstName: "Eva", jobTitle: "Busfahrer:in (m/w/d)", employer: "Hafermann Reisen", tone: "sie" } });
    }));

  it("cancels the pending mail when the status is corrected", () =>
    tx(async () => {
      await db.query("update applications set status = 'shortlisted' where id = $1", [APP]);
      await db.query("update applications set status = 'interview' where id = $1", [APP]);
      expect(await pending()).toEqual(["interview"]);
      await db.query("update applications set status = 'screening' where id = $1", [APP]);
      expect(await pending()).toEqual([]);
    }));

  it("skips the automatic rejection after a personal one", () =>
    tx(async () => {
      await db.query("insert into mail_outbox (application_id, to_email, template) values ($1, 'eva@example.org', 'rejection')", [APP]);
      await db.query("update applications set status = 'rejected' where id = $1", [APP]);
      expect(await pending()).toEqual([]);
    }));

  it("sends one reminder after 7 days in review", () =>
    tx(async () => {
      await db.query("update applications set submitted_at = now() - interval '8 days' where id = $1", [APP]);
      expect((await db.query("select public.queue_pending_reminders() as n")).rows[0].n).toBe(1);
      expect((await db.query("select public.queue_pending_reminders() as n")).rows[0].n).toBe(0);
      expect(await pending()).toEqual(["pending"]);
    }));
});
