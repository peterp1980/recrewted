// Google Indexing API queue (0033).
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase } from "./db";

const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
const VAC = "20000000-0000-0000-0000-00000000000a";
let db: Client;
const queue = async () => (await db.query("select kind, status from indexing_outbox where vacancy_id = $1 order by id", [VAC])).rows;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_indexing_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1)", [CUSTOMER]);
  await db.query("insert into organizations (id, name) values ($1, 'A')", [ORG]);
  await db.query("insert into customer_members values ($1, $2)", [ORG, CUSTOMER]);
  await db.query("insert into vacancies (id, organization_id, title) values ($1, $2, 'Fahrer (m/w/d)')", [VAC, ORG]);
});
afterAll(async () => db?.end());

describe("indexing queue", () => {
  it("queues nothing for drafts", async () => {
    await db.query("update vacancies set title = 'Fahrer:in (m/w/d)' where id = $1", [VAC]);
    expect(await queue()).toEqual([]);
  });
  it("queues 'updated' when a job goes live and when it changes, one open entry only", async () => {
    await db.query("update vacancies set status = 'active' where id = $1", [VAC]);
    await db.query("update vacancies set location = 'Witten' where id = $1", [VAC]);
    expect(await queue()).toEqual([{ kind: "updated", status: "pending" }]);
  });
  it("ignores changes Google does not see", async () => {
    await db.query("update indexing_outbox set status = 'sent'");
    await db.query("update vacancies set openings = 2 where id = $1", [VAC]);
    expect((await queue()).filter((q) => q.status === "pending")).toEqual([]);
  });
  it("queues 'deleted' when the job is filled", async () => {
    await db.query("update vacancies set status = 'filled' where id = $1", [VAC]);
    expect((await queue()).at(-1)).toEqual({ kind: "deleted", status: "pending" });
  });
  it("is hidden from customers", () =>
    asUser(db, CUSTOMER, async (c) => {
      expect((await c.query("select count(*)::int as n from indexing_outbox")).rows[0].n).toBe(0);
      await expect(c.query("select claim_indexing(1)")).rejects.toThrow(/permission denied/);
    }));
});
