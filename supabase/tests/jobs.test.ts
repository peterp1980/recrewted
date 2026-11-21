// F1: publication date, coordinates from postal codes, and briefing fields for the job board.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase } from "./db";

const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_jobs_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1)", [CUSTOMER]);
  await db.query("insert into organizations (id, name) values ($1, 'A')", [ORG]);
  await db.query("insert into customer_members values ($1, $2)", [ORG, CUSTOMER]);
  await db.query("insert into postal_codes values ('80331', 'München', 48.1372, 11.5755), ('86150', 'Augsburg', 48.3665, 10.8944)");
});
afterAll(async () => db?.end());

const tx = async (fn: () => Promise<void>) => {
  await db.query("begin");
  try { await fn(); } finally { await db.query("rollback"); }
};

describe("job board data", () => {
  it("sets published_at when a vacancy goes live, and filled_at when it is filled", () =>
    tx(async () => {
      const id = (await db.query("insert into vacancies (organization_id, title, salary_min, salary_max) values ($1, 'Job', 1, 2) returning id", [ORG])).rows[0].id;
      expect((await db.query("select published_at from vacancies where id = $1", [id])).rows[0].published_at).toBeNull();
      await db.query("update vacancies set status = 'active' where id = $1", [id]);
      const first = (await db.query("select published_at from vacancies where id = $1", [id])).rows[0].published_at;
      expect(first).not.toBeNull();
      await db.query("update vacancies set status = 'paused' where id = $1", [id]);
      await db.query("update vacancies set status = 'active' where id = $1", [id]);
      expect((await db.query("select published_at from vacancies where id = $1", [id])).rows[0].published_at).toEqual(first);
      await db.query("update vacancies set status = 'filled' where id = $1", [id]);
      expect((await db.query("select filled_at from vacancies where id = $1", [id])).rows[0].filled_at).not.toBeNull();
    }));

  it("takes coordinates from the postal code", () =>
    tx(async () => {
      const id = (await db.query("insert into vacancies (organization_id, title, postal_code) values ($1, 'Job', '80331') returning id", [ORG])).rows[0].id;
      expect((await db.query("select latitude, longitude from vacancies where id = $1", [id])).rows[0]).toEqual({ latitude: 48.1372, longitude: 11.5755 });
      await db.query("update vacancies set postal_code = '86150' where id = $1", [id]);
      expect((await db.query("select latitude from vacancies where id = $1", [id])).rows[0].latitude).toBe(48.3665);
      await db.query("update vacancies set postal_code = null where id = $1", [id]);
      expect((await db.query("select latitude from vacancies where id = $1", [id])).rows[0].latitude).toBeNull();
    }));

  it("copies postal code and occupational field from the briefing", () =>
    asUser(db, CUSTOMER, async (c) => {
      const id = (await c.query("insert into vacancies (organization_id, title) values ($1, 'Job') returning id", [ORG])).rows[0].id;
      await c.query("insert into vacancy_briefings (vacancy_id, data) values ($1, $2)", [id, { postalCode: "80331", category: "craft" }]);
      expect((await c.query("select postal_code, category, latitude from vacancies where id = $1", [id])).rows[0]).toEqual({ postal_code: "80331", category: "craft", latitude: 48.1372 });
      await c.query("update vacancy_briefings set data = $2 where vacancy_id = $1", [id, { postalCode: "abc", category: "astronaut" }]);
      expect((await c.query("select postal_code, category from vacancies where id = $1", [id])).rows[0]).toEqual({ postal_code: null, category: null });
    }));

  it("lets anyone read postal codes, nobody write them via the API", () =>
    asUser(db, null, async (c) => {
      expect(Number((await c.query("select count(*) from postal_codes")).rows[0].count)).toBe(2);
      await expect(c.query("insert into postal_codes values ('10115', 'Berlin', 52.5, 13.4)")).rejects.toThrow(/row-level security/);
    }, "anon"));
});

describe("salary (optional since 0016)", () => {
  it("allows publishing without a salary but still rejects an inverted range", () =>
    tx(async () => {
      const r = await db.query("insert into vacancies (organization_id, title, status) values ($1, 'Ohne Gehalt', 'active') returning published_at", [ORG]);
      expect(r.rows[0].published_at).not.toBeNull();
      await db.query("savepoint s");
      await expect(db.query("insert into vacancies (organization_id, title, status, salary_min, salary_max) values ($1, 'Falsch', 'active', 5, 2)", [ORG])).rejects.toThrow(/salary_range_valid/);
      await db.query("rollback to savepoint s");
    }));
});
