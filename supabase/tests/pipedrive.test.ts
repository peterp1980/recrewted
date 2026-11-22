// F15 Pipedrive queue (0029).
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase } from "./db";

const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
const VAC = "20000000-0000-0000-0000-00000000000a";
const VAC2 = "20000000-0000-0000-0000-00000000000b";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_pipedrive_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1), ($2)", [ADMIN, CUSTOMER]);
  await db.query("update profiles set role = 'admin' where id = $1", [ADMIN]);
  await db.query("insert into organizations (id, name) values ($1, 'A')", [ORG]);
  await db.query("insert into customer_members values ($1, $2)", [ORG, CUSTOMER]);
  await db.query("insert into vacancies (id, organization_id, title, pipedrive_deal_id) values ($1, $2, 'Fahrer (m/w/d)', 4711), ($3, $2, 'Ohne Deal', null)", [VAC, ORG, VAC2]);
});
afterAll(async () => db?.end());

describe("crm outbox", () => {
  it("queues status changes of vacancies with a deal only", async () => {
    await db.query("update vacancies set status = 'active' where id in ($1, $2)", [VAC, VAC2]);
    await db.query("update vacancies set title = 'Fahrer:in (m/w/d)' where id = $1", [VAC]);
    const rows = (await db.query("select kind, vacancy_id, payload from crm_outbox where kind = 'vacancy_status'")).rows;
    expect(rows).toEqual([{ kind: "vacancy_status", vacancy_id: VAC, payload: { from: "draft", to: "active", dealId: 4711 } }]);
  });

  it("queues contact requests as leads", async () => {
    const { rows } = await db.query("insert into contact_requests (name, email, message) values ('Max Muster', 'max@a.de', 'Wir suchen Fahrer.') returning id");
    expect((await db.query("select count(*)::int as n from crm_outbox where kind = 'lead' and contact_request_id = $1", [rows[0].id])).rows[0].n).toBe(1);
  });

  it("claims each entry once and stops after five attempts", async () => {
    await db.query("set role service_role");
    const first = (await db.query("select id from claim_crm_outbox(10)")).rows;
    expect(first.length).toBe(2);
    await db.query("reset role");
    await db.query("update crm_outbox set attempts = 5");
    await db.query("set role service_role");
    expect((await db.query("select id from claim_crm_outbox(10)")).rows.length).toBe(0);
    await db.query("reset role");
  });

  it("is hidden from customers and not claimable by users", () =>
    asUser(db, CUSTOMER, async (c) => {
      expect((await c.query("select count(*)::int as n from crm_outbox")).rows[0].n).toBe(0);
      await expect(c.query("select claim_crm_outbox(1)")).rejects.toThrow(/permission denied/);
    }));

  it("staff can read it", () =>
    asUser(db, ADMIN, async (c) => {
      expect((await c.query("select count(*)::int as n from crm_outbox")).rows[0].n).toBe(2);
    }));
});
