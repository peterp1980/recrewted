// F13: customers write the briefing; core fields flow into the vacancy until the contract is signed.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const RECRUITER = "00000000-0000-0000-0000-0000000000a2";
const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const OTHER = "00000000-0000-0000-0000-0000000000c2";
const ORG = "10000000-0000-0000-0000-00000000000a";
const ORG_B = "10000000-0000-0000-0000-00000000000b";

let db: Client;

const data = {
  v: 1, title: "Elektroniker (m/w/d)", employmentType: "full_time", location: "München", remote: "hybrid",
  salaryMin: 42000, salaryMax: 52000, salaryPeriod: "year",
};

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_briefing_test") });
  await db.connect();
  for (const id of [RECRUITER, CUSTOMER, OTHER]) await db.query("insert into auth.users (id) values ($1)", [id]);
  await db.query("update profiles set role = 'recruiter' where id = $1", [RECRUITER]);
  await db.query("insert into organizations (id, name) values ($1, 'A'), ($2, 'B')", [ORG, ORG_B]);
  await db.query("insert into customer_members values ($1, $2), ($3, $4)", [ORG, CUSTOMER, ORG_B, OTHER]);
});

afterAll(async () => {
  await db?.end();
});

const newDraft = async (c: Client) =>
  (await c.query("insert into vacancies (organization_id, title, created_by) values ($1, 'Neue Vakanz', $2) returning id", [ORG, CUSTOMER])).rows[0].id as string;

describe("briefing", () => {
  it("copies core fields into the draft vacancy", () =>
    asUser(db, CUSTOMER, async (c) => {
      const id = await newDraft(c);
      await c.query("insert into vacancy_briefings (vacancy_id, data) values ($1, $2)", [id, data]);
      const v = (await c.query("select title, location, remote, employment_type, salary_min, salary_max, salary_period from vacancies where id = $1", [id])).rows[0];
      expect(v).toEqual({
        title: "Elektroniker (m/w/d)", location: "München", remote: false, employment_type: "full_time",
        salary_min: "42000.00", salary_max: "52000.00", salary_period: "year",
      });
    }));

  it("keeps the old title when the briefing title is empty and drops an invalid salary range", () =>
    asUser(db, CUSTOMER, async (c) => {
      const id = await newDraft(c);
      await c.query("insert into vacancy_briefings (vacancy_id, data) values ($1, $2)", [id, { ...data, title: " ", salaryMin: 60000 }]);
      const v = (await c.query("select title, salary_min, salary_max from vacancies where id = $1", [id])).rows[0];
      expect(v).toEqual({ title: "Neue Vakanz", salary_min: null, salary_max: null });
    }));

  it("stamps the real submitter, whatever the client sends", () =>
    asUser(db, CUSTOMER, async (c) => {
      const id = await newDraft(c);
      await c.query("insert into vacancy_briefings (vacancy_id, data) values ($1, $2)", [id, data]);
      await c.query("update vacancy_briefings set submitted_at = now(), submitted_by = $2 where vacancy_id = $1", [id, OTHER]);
      expect((await c.query("select submitted_by from vacancy_briefings where vacancy_id = $1", [id])).rows[0].submitted_by).toBe(CUSTOMER);
    }));

  it("no longer changes the vacancy once the contract is signed", async () => {
    await db.query("begin");
    try {
      const id = (await db.query("insert into vacancies (organization_id, title) values ($1, 'Alt') returning id", [ORG])).rows[0].id;
      await db.query("insert into vacancy_briefings (vacancy_id, data) values ($1, $2)", [id, data]);
      await db.query("update vacancies set status = 'active' where id = $1", [id]);
      await db.query("update vacancy_briefings set data = $2 where vacancy_id = $1", [id, { ...data, title: "Geändert", salaryMax: 99000 }]);
      const v = (await db.query("select title, salary_max from vacancies where id = $1", [id])).rows[0];
      expect(v).toEqual({ title: "Elektroniker (m/w/d)", salary_max: "52000.00" });
    } finally {
      await db.query("rollback");
    }
  });

  it("lets customers write briefings only for their own organization", () =>
    asUser(db, OTHER, async (c) => {
      await c.query("reset role");
      const id = (await c.query("insert into vacancies (organization_id, title) values ($1, 'A-Job') returning id", [ORG])).rows[0].id;
      await c.query("set local role authenticated");
      expect(await errorOf(c, () => c.query("insert into vacancy_briefings (vacancy_id, data) values ($1, '{}')", [id]))).toMatch(/row-level security/);
    }));

  it("lets recruiters write briefings for any customer", () =>
    asUser(db, RECRUITER, async (c) => {
      const id = (await c.query("insert into vacancies (organization_id, title) values ($1, 'B-Job') returning id", [ORG_B])).rows[0].id;
      expect(await errorOf(c, () => c.query("insert into vacancy_briefings (vacancy_id, data) values ($1, $2)", [id, data]))).toBeNull();
      expect((await c.query("select title from vacancies where id = $1", [id])).rows[0].title).toBe("Elektroniker (m/w/d)");
    }));
});
