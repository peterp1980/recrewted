// F2/F3: atomic application submit, knockouts, duplicates, mail queue; nobody but the server may call it.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const ORG = "10000000-0000-0000-0000-00000000000a";
const VAC = "20000000-0000-0000-0000-00000000000a";
const DRAFT = "20000000-0000-0000-0000-00000000000d";
const Q = "70000000-0000-0000-0000-000000000001";
let db: Client;

const payload = (over: Record<string, unknown> = {}) => ({
  vacancy_id: VAC, first_name: "Eva", last_name: "Muster", email: "Eva@Example.org", phone: null, talent_pool: false,
  status: "screening", consent_version: "2026-11-21", knockout_reasons: [], answers: [{ question_id: Q, answer: true }],
  entry_point: "jobboard", utm_source: "google", utm_medium: "cpc",
  mails: [{ template: "application_received", data: { firstName: "Eva", jobTitle: "Job" } }],
  ...over,
});

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_apply_test") });
  await db.connect();
  await db.query("insert into organizations (id, name) values ($1, 'A')", [ORG]);
  await db.query("insert into vacancies (id, organization_id, title, status, salary_min, salary_max) values ($1, $3, 'Job', 'active', 1, 2), ($2, $3, 'Draft', 'draft', null, null)", [VAC, DRAFT, ORG]);
  await db.query("insert into screening_questions (id, vacancy_id, position, question, kind, knockout_rule) values ($1, $2, 1, 'Führerschein?', 'yes_no', '{\"exclude\":\"no\"}')", [Q, VAC]);
});
afterAll(async () => db?.end());

const tx = async (fn: () => Promise<void>) => {
  await db.query("begin");
  try { await fn(); } finally { await db.query("rollback"); }
};
const submit = (p: unknown) => db.query("select public.submit_application($1) as r", [p]).then((r) => r.rows[0].r);

describe("submit_application", () => {
  it("stores everything in one go", () =>
    tx(async () => {
      const { application_id: app, candidate_id: cand } = await submit(payload());
      expect((await db.query("select email from candidates where id = $1", [cand])).rows[0].email).toBe("eva@example.org");
      expect((await db.query("select status, consent_version, processing_consent_at is not null as c from applications where id = $1", [app])).rows[0]).toEqual({ status: "screening", consent_version: "2026-11-21", c: true });
      expect((await db.query("select answer from screening_answers where application_id = $1", [app])).rows[0].answer).toBe(true);
      expect((await db.query("select entry_point, utm_source from application_attribution where application_id = $1", [app])).rows[0]).toEqual({ entry_point: "jobboard", utm_source: "google" });
      expect((await db.query("select name from events where application_id = $1 order by id", [app])).rows.map((r) => r.name)).toEqual(["apply_submit", "knockout_passed"]);
      expect((await db.query("select to_email, template from mail_outbox where application_id = $1", [app])).rows).toEqual([{ to_email: "eva@example.org", template: "application_received" }]);
    }));

  it("closes knocked-out applications right away and keeps the reasons", () =>
    tx(async () => {
      const { application_id: app } = await submit(payload({ status: "knockout_failed", knockout_reasons: [Q], answers: [{ question_id: Q, answer: false }] }));
      const row = (await db.query("select status, closed_at is not null as closed, knockout_reasons from applications where id = $1", [app])).rows[0];
      expect(row).toEqual({ status: "knockout_failed", closed: true, knockout_reasons: [Q] });
      expect((await db.query("select name from events where application_id = $1", [app])).rows.map((r) => r.name)).toEqual(["apply_submit"]);
    }));

  it("reuses the candidate by e-mail and refuses a second application to the same job", () =>
    tx(async () => {
      const first = await submit(payload());
      expect(await errorOf(db, () => submit(payload({ email: "EVA@example.org" })))).toMatch(/duplicate_application/);
      expect(Number((await db.query("select count(*) from candidates")).rows[0].count)).toBe(1);
      expect(first.candidate_id).toBeTruthy();
    }));

  it("refuses inactive vacancies and missing contact data", () =>
    tx(async () => {
      expect(await errorOf(db, () => submit(payload({ vacancy_id: DRAFT })))).toMatch(/vacancy_not_active/);
      expect(await errorOf(db, () => submit(payload({ email: null, phone: null })))).toMatch(/contact_required/);
    }));

  it("ignores answers to questions of other vacancies and queues no mail without e-mail", () =>
    tx(async () => {
      const { application_id: app } = await submit(payload({ email: null, phone: "01711234567", answers: [{ question_id: "70000000-0000-0000-0000-0000000000ff", answer: true }] }));
      expect(Number((await db.query("select count(*) from screening_answers where application_id = $1", [app])).rows[0].count)).toBe(0);
      expect(Number((await db.query("select count(*) from mail_outbox where application_id = $1", [app])).rows[0].count)).toBe(0);
    }));

  it("cannot be called by visitors or signed-in users", async () => {
    await asUser(db, null, async (c) => {
      await expect(c.query("select public.submit_application($1)", [payload()])).rejects.toThrow(/permission denied/);
    }, "anon");
    await asUser(db, "00000000-0000-0000-0000-0000000000c1", async (c) => {
      expect(await errorOf(c, () => c.query("select public.submit_application($1)", [payload()]))).toMatch(/permission denied/);
      expect(await errorOf(c, () => c.query("select * from public.claim_due_mails(10)"))).toMatch(/permission denied/);
    });
  });

  it("claims due mails once", () =>
    tx(async () => {
      await submit(payload());
      await submit(payload({ email: "max@example.org", mails: [{ template: "knockout_rejection", data: {}, send_after: "2999-01-01T00:00:00Z" }] }));
      const claimed = (await db.query("select template from public.claim_due_mails(10)")).rows;
      expect(claimed).toEqual([{ template: "application_received" }]);
    }));
});
