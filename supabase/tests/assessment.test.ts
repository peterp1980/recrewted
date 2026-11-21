// Assessments (0015): access, one active test per stage, retention of uploads, data export.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const STAFF = "00000000-0000-0000-0000-0000000000a1";
const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
const VAC = "20000000-0000-0000-0000-00000000000a";
const CAND = "40000000-0000-0000-0000-000000000001";
const APP = "50000000-0000-0000-0000-000000000001";
const TEST = "60000000-0000-0000-0000-000000000001";
const Q1 = "61000000-0000-0000-0000-000000000001";
const Q2 = "61000000-0000-0000-0000-000000000002";
const ATT = "62000000-0000-0000-0000-000000000001";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_assessment_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1), ($2)", [STAFF, CUSTOMER]);
  await db.query("update profiles set role = 'recruiter' where id = $1", [STAFF]);
  await db.query("insert into organizations (id, name) values ($1, 'A')", [ORG]);
  await db.query("insert into customer_members values ($1, $2)", [ORG, CUSTOMER]);
  await db.query("insert into vacancies (id, organization_id, title, status, salary_min, salary_max) values ($1, $2, 'Job', 'active', 1, 2)", [VAC, ORG]);
  await db.query("insert into candidates (id, first_name, last_name, email) values ($1, 'Eva', 'M', 'eva@example.org')", [CAND]);
  await db.query("insert into applications (id, vacancy_id, candidate_id, status) values ($1, $2, $3, 'screening')", [APP, VAC, CAND]);
  await db.query("insert into assessments (id, vacancy_id, title, stage, time_limit_minutes) values ($1, $2, 'Fachtest', 'invite', 30)", [TEST, VAC]);
  await db.query(
    `insert into assessment_questions (id, assessment_id, position, kind, prompt, options, correct, points) values
      ($1, $3, 1, 'single', 'Welche Kampagnenart?', '["Search","Display"]', '"Search"', 2),
      ($2, $3, 2, 'upload', 'Laden Sie Ihre Präsentation hoch.', null, null, 5)`,
    [Q1, Q2, TEST],
  );
  await db.query("insert into assessment_attempts (id, assessment_id, application_id, token_hash, status, auto_points, max_points) values ($1, $2, $3, 'hash-1', 'submitted', 2, 7)", [ATT, TEST, APP]);
  await db.query("insert into assessment_answers (attempt_id, question_id, answer, auto_points) values ($1, $2, '\"Search\"', 2)", [ATT, Q1]);
  await db.query("insert into assessment_answers (attempt_id, question_id, file_path, file_name) values ($1, $2, 'a/b.pptx', 'Praesentation.pptx')", [ATT, Q2]);
  await db.query("insert into assessment_events (attempt_id, type) values ($1, 'left_window'), ($1, 'paste')", [ATT]);
});
afterAll(async () => db?.end());

describe("assessment access", () => {
  it("lets staff manage tests and score answers", () =>
    asUser(db, STAFF, async (c) => {
      await c.query("update assessment_answers set manual_points = 4 where attempt_id = $1 and question_id = $2", [ATT, Q2]);
      expect((await c.query("select count(*)::int as n from assessment_events where attempt_id = $1", [ATT])).rows[0].n).toBe(2);
      await c.query("reset role");
      // Point changes are applicant data and land in the audit log with the acting user.
      const log = await c.query("select actor from audit_log where table_name = 'assessment_answers' and action = 'update'");
      expect(log.rows).toEqual([{ actor: STAFF }]);
    }));

  it("hides answers, events and results from customers until the candidate is shortlisted", async () => {
    await asUser(db, CUSTOMER, async (c) => {
      expect((await c.query("select * from assessment_attempts")).rows).toHaveLength(0);
      expect((await c.query("select * from assessment_answers")).rows).toHaveLength(0);
      expect((await c.query("select * from assessment_events")).rows).toHaveLength(0);
      expect((await c.query("select * from assessment_questions")).rows).toHaveLength(0);
      expect((await c.query("select title from assessments")).rows).toEqual([{ title: "Fachtest" }]);
    });
    await db.query("update applications set status = 'shortlisted' where id = $1", [APP]);
    await asUser(db, CUSTOMER, async (c) => {
      expect((await c.query("select auto_points from assessment_attempts")).rows).toEqual([{ auto_points: "2.0" }]);
      expect(await errorOf(c, () => c.query("update assessment_attempts set manual_points = 99"))).toBeNull();
      expect((await c.query("select manual_points from assessment_attempts")).rows[0].manual_points).toBeNull();
    });
    await db.query("update applications set status = 'screening', shortlisted_at = null where id = $1", [APP]);
  });

  it("allows only one active test per stage", async () => {
    await db.query("begin");
    expect(await errorOf(db, () => db.query("insert into assessments (vacancy_id, title, stage) values ($1, 'Zweiter', 'invite')", [VAC]))).toMatch(/assessments_one_active_per_stage/);
    await db.query("insert into assessments (vacancy_id, title, stage, active) values ($1, 'Archiv', 'invite', false)", [VAC]);
    await db.query("insert into assessments (vacancy_id, title, stage) values ($1, 'Kurztest', 'apply')", [VAC]);
    await db.query("rollback");
  });

  it("rejects unknown event types and question kinds", async () => {
    await db.query("begin");
    expect(await errorOf(db, () => db.query("insert into assessment_events (attempt_id, type) values ($1, 'keystrokes')", [ATT]))).toMatch(/check constraint/);
    expect(await errorOf(db, () => db.query("insert into assessment_questions (assessment_id, position, kind, prompt) values ($1, 9, 'essay', 'Bitte schreiben')", [TEST]))).toMatch(/check constraint/);
    await db.query("rollback");
  });
});

describe("privacy", () => {
  it("exports tests, answers and the browser log", async () => {
    const r = (await db.query("select public.candidate_export($1) as e", [CAND])).rows[0].e;
    const a = r.applications[0].assessments[0];
    expect(a).toMatchObject({ test: "Fachtest", max_points: 7 });
    expect(a.answers.map((x: { task: string }) => x.task)).toEqual(["Welche Kampagnenart?", "Laden Sie Ihre Präsentation hoch."]);
    expect(a.answers[1].file).toBe("Praesentation.pptx");
    expect(a.browser_log.map((x: { type: string }) => x.type).sort()).toEqual(["left_window", "paste"]);
  });

  it("returns uploaded files of deleted applications so the job can remove them", async () => {
    await db.query("begin");
    await db.query("update applications set status = 'rejected', closed_at = now() - interval '7 months' where id = $1", [APP]);
    const r = (await db.query("select public.run_retention() as r")).rows[0].r;
    expect(r.assessment_paths).toEqual(["a/b.pptx"]);
    expect((await db.query("select count(*)::int as n from assessment_attempts")).rows[0].n).toBe(0);
    await db.query("rollback");
  });

  it("keeps the upload bucket private", async () => {
    expect((await db.query("select public from storage.buckets where id = 'assessment-uploads'")).rows[0].public).toBe(false);
  });
});
