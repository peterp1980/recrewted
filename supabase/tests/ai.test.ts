// AI logging and oversight (0025).
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const RECRUITER = "00000000-0000-0000-0000-0000000000a1";
const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
const VAC = "20000000-0000-0000-0000-00000000000a";
let db: Client;

const insert = async (kind: string, output: object) =>
  (await db.query("insert into ai_recommendations (vacancy_id, organization_id, kind, model, input_ref, output, input_hash) values ($1, $2, $3, 'claude-opus-5-5', '{}', $4, repeat('a', 64)) returning id", [VAC, ORG, kind, output])).rows[0].id as string;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_ai_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1), ($2)", [RECRUITER, CUSTOMER]);
  await db.query("update profiles set role = 'recruiter' where id = $1", [RECRUITER]);
  await db.query("insert into organizations (id, name) values ($1, 'Kunde')", [ORG]);
  await db.query("insert into customer_members (organization_id, profile_id) values ($1, $2)", [ORG, CUSTOMER]);
  await db.query("insert into vacancies (id, organization_id, title) values ($1, $2, 'Job')", [VAC, ORG]);
});
afterAll(async () => db?.end());

describe("ai log", () => {
  it("switches: assist on, scoring off by default", async () => {
    expect((await db.query("select ai_assist, ai_scoring from organizations")).rows[0]).toEqual({ ai_assist: true, ai_scoring: false });
  });

  it("records a decision once and never changes the logged suggestion", async () => {
    const id = await insert("job_ad_text", { title: "x" });
    await db.query("update ai_recommendations set status = 'modified', final_output = '{\"title\":\"y\"}' where id = $1", [id]);
    const row = (await db.query("select accepted, decided_at is not null as decided from ai_recommendations where id = $1", [id])).rows[0];
    expect(row).toEqual({ accepted: true, decided: true });
    await db.query("begin");
    try {
      expect(await errorOf(db, () => db.query("update ai_recommendations set status = 'rejected' where id = $1", [id]))).toMatch(/ai_already_decided/);
      expect(await errorOf(db, () => db.query("update ai_recommendations set output = '{}' where id = $1", [id]))).toMatch(/ai_log_immutable/);
    } finally {
      await db.query("rollback");
    }
  });

  it("monitors deviation between suggested and human ratings, for staff only", async () => {
    const id = await insert("scorecard_rating", { ratings: [{ criterionId: "c1", rating: 4 }, { criterionId: "c2", rating: null }] });
    await db.query("update ai_recommendations set status = 'modified', final_output = $2 where id = $1", [id, { ratings: [{ criterionId: "c1", rating: 2 }, { criterionId: "c2", rating: 3 }] }]);
    await asUser(db, RECRUITER, async (c) => {
      const r = (await c.query("select kind, total, modified, rating_pairs, mean_abs_deviation from ai_monitoring() where kind = 'scorecard_rating'")).rows[0];
      expect(r).toEqual({ kind: "scorecard_rating", total: "1", modified: "1", rating_pairs: "1", mean_abs_deviation: "2.00" });
    });
    await asUser(db, CUSTOMER, async (c) => {
      expect((await c.query("select * from ai_monitoring()")).rows).toEqual([]);
      expect((await c.query("select * from ai_recommendations")).rows).toEqual([]);
    });
  });
});
