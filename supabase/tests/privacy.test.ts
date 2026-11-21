// F12/F20: click IDs only with marketing consent, campaign attribution, retention, data export.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const ORG = "10000000-0000-0000-0000-00000000000a";
const VAC = "20000000-0000-0000-0000-00000000000a";
const ACC = "80000000-0000-0000-0000-00000000000a";
const CAMP = "30000000-0000-0000-0000-00000000000a";
let db: Client;

const payload = (o: Record<string, unknown> = {}) => ({
  vacancy_id: VAC, first_name: "Eva", last_name: "M", email: "eva@example.org", status: "screening", consent_version: "v1",
  utm_source: "meta", utm_medium: "paid_social", utm_campaign: "job-30000000", click_id_type: "fbclid", click_id: "fb.1.abc", ...o,
});
const submit = (p: unknown) => db.query("select public.submit_application($1) as r", [p]).then((r) => r.rows[0].r);
const tx = async (fn: () => Promise<void>) => { await db.query("begin"); try { await fn(); } finally { await db.query("rollback"); } };

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_privacy_test") });
  await db.connect();
  await db.query("insert into organizations (id, name) values ($1, 'A')", [ORG]);
  await db.query("insert into vacancies (id, organization_id, title, status, salary_min, salary_max) values ($1, $2, 'Job', 'active', 1, 2)", [VAC, ORG]);
  await db.query("insert into ad_accounts (id, platform, owner, external_account_id) values ($1, 'meta', 'recrewted', 'act_1')", [ACC]);
  await db.query("insert into campaigns (id, vacancy_id, ad_account_id, channel, utm_campaign, status) values ($1, $2, $3, 'meta', 'job-30000000', 'running')", [CAMP, VAC, ACC]);
});
afterAll(async () => db?.end());

describe("attribution (F12)", () => {
  it("stores click IDs only with marketing consent and links the campaign", () =>
    tx(async () => {
      const a = await submit(payload({ marketing_consent: true }));
      const b = await submit(payload({ email: "max@example.org", marketing_consent: false }));
      const rows = (await db.query("select application_id, campaign_id, ad_account_owner, channel, click_id_type, click_id, marketing_consent from application_attribution order by marketing_consent desc")).rows;
      expect(rows[0]).toMatchObject({ application_id: a.application_id, campaign_id: CAMP, ad_account_owner: "recrewted", channel: "meta", click_id_type: "fbclid", click_id: "fb.1.abc", marketing_consent: true });
      expect(rows[1]).toMatchObject({ application_id: b.application_id, campaign_id: CAMP, click_id: null, marketing_consent: false });
      const ev = (await db.query("select campaign_id, ad_account_owner, channel from events where name = 'apply_submit' and application_id = $1", [a.application_id])).rows[0];
      expect(ev).toEqual({ campaign_id: CAMP, ad_account_owner: "recrewted", channel: "meta" });
    }));
});

describe("retention (F20)", () => {
  it("deletes old closed applications with their candidates, expires click IDs and old events", () =>
    tx(async () => {
      const old = await submit(payload({ marketing_consent: true }));
      const keep = await submit(payload({ email: "pool@example.org", talent_pool: true }));
      await db.query("update applications set status = 'rejected' where id = any($1)", [[old.application_id, keep.application_id]]);
      await db.query("update applications set closed_at = now() - interval '7 months', cv_storage_path = 'x/lebenslauf.pdf' where id = $1", [old.application_id]);
      await db.query("update applications set closed_at = now() - interval '7 months' where id = $1", [keep.application_id]);
      await db.query("insert into events (name, occurred_at) values ('page_view', now() - interval '27 months'), ('page_view', now())");
      const fresh = await submit(payload({ email: "new@example.org", marketing_consent: true }));
      await db.query("update applications set submitted_at = now() - interval '100 days' where id = $1", [fresh.application_id]);

      const r = (await db.query("select public.run_retention() as r")).rows[0].r;
      expect(r).toMatchObject({ applications: 2, candidates: 1, click_ids: 1, cv_paths: ["x/lebenslauf.pdf"] });
      expect(Number((await db.query("select count(*) from candidates where email = 'pool@example.org'")).rows[0].count)).toBe(1);
      expect((await db.query("select click_id from application_attribution where application_id = $1", [fresh.application_id])).rows[0].click_id).toBeNull();
      expect(Number((await db.query("select count(*) from events where name = 'page_view'")).rows[0].count)).toBe(1);
      expect((await db.query("select action from audit_log where action = 'retention'")).rows).toHaveLength(1);
    }));

  it("exports everything about a candidate", () =>
    tx(async () => {
      const a = await submit(payload());
      const ex = (await db.query("select public.candidate_export($1) as e", [a.candidate_id])).rows[0].e;
      expect(ex.candidate).toMatchObject({ first_name: "Eva", email: "eva@example.org" });
      expect(ex.applications[0]).toMatchObject({ job: "Job", status: "screening", origin: { utm_source: "meta" } });
    }));

  it("is not callable by visitors or users", () =>
    asUser(db, null, async (c) => {
      expect(await errorOf(c, () => c.query("select public.run_retention()"))).toMatch(/permission denied/);
      expect(await errorOf(c, () => c.query("select public.candidate_export($1)", [ORG]))).toMatch(/permission denied/);
    }, "anon"));
});

describe("contact requests (F21)", () => {
  it("are not readable or writable by visitors", () =>
    asUser(db, null, async (c) => {
      expect(await errorOf(c, () => c.query("insert into contact_requests (name, email, message) values ('Max', 'm@x.de', 'Hallo Welt')"))).toMatch(/row-level security/);
      expect(Number((await c.query("select count(*) from contact_requests")).rows[0].count)).toBe(0);
    }, "anon"));
});

describe("talent pool retention (0018)", () => {
  it("deletes pool-only candidates after 24 months, keeps recent ones", () =>
    tx(async () => {
      await db.query("insert into candidates (first_name, last_name, email, talent_pool_consent_at) values ('Alt', 'A', 'alt@example.org', now() - interval '25 months'), ('Neu', 'N', 'neu@example.org', now() - interval '1 month')");
      await db.query("select public.run_retention()");
      const left = (await db.query("select email from candidates where email in ('alt@example.org', 'neu@example.org')")).rows.map((r) => r.email);
      expect(left).toEqual(["neu@example.org"]);
    }));

  it("stores profile opt-in and alert preferences as objects only", () =>
    tx(async () => {
      await db.query("insert into candidates (first_name, last_name, email, profile_opt_in_at, alert_prefs) values ('P', 'P', 'p@example.org', now(), '{\"radiusKm\": 30}')");
      await db.query("savepoint s");
      await expect(db.query("update candidates set alert_prefs = '[]' where email = 'p@example.org'")).rejects.toThrow(/check constraint/);
      await db.query("rollback to savepoint s");
    }));
});
