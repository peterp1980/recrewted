// Employer features (0023): team roles, comments with mentions, notifications, dashboard aggregates.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const RECRUITER = "00000000-0000-0000-0000-0000000000a1";
const OWNER = "00000000-0000-0000-0000-0000000000c1";
const VIEWER = "00000000-0000-0000-0000-0000000000c2";
const OUTSIDER = "00000000-0000-0000-0000-0000000000c3";
const ORG = "10000000-0000-0000-0000-00000000000a";
const ORG_B = "10000000-0000-0000-0000-00000000000b";
const VAC = "20000000-0000-0000-0000-00000000000a";
const APP = "50000000-0000-0000-0000-000000000001";
const APP2 = "50000000-0000-0000-0000-000000000002";
let db: Client;

const mails = async (template: string) => (await db.query("select to_email, data from mail_outbox where template = $1 order by to_email", [template])).rows;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_employer_test") });
  await db.connect();
  await db.query(
    "insert into auth.users (id, email, raw_user_meta_data) values ($1, 'rec@recrewted.de', '{\"full_name\":\"Rita Recruiter\"}'), ($2, 'owner@kunde.de', '{\"full_name\":\"Olaf Owner\"}'), ($3, 'fach@kunde.de', '{\"full_name\":\"Vera Fach\"}'), ($4, 'x@other.de', '{}')",
    [RECRUITER, OWNER, VIEWER, OUTSIDER],
  );
  await db.query("update profiles set role = 'recruiter' where id = $1", [RECRUITER]);
  await db.query("insert into organizations (id, name) values ($1, 'Kunde'), ($2, 'Andere')", [ORG, ORG_B]);
  await db.query("insert into customer_members (organization_id, profile_id, member_role) values ($1, $2, 'owner'), ($1, $3, 'viewer'), ($4, $5, 'owner')", [ORG, OWNER, VIEWER, ORG_B, OUTSIDER]);
  await db.query("insert into vacancies (id, organization_id, title, status, published_at) values ($1, $2, 'Busfahrer', 'active', now() - interval '4 days')", [VAC, ORG]);
  for (const [i, app] of [[1, APP], [2, APP2]] as const) {
    const cand = `40000000-0000-0000-0000-00000000000${i}`;
    await db.query("insert into candidates (id, first_name, last_name, email) values ($1, 'Kai', 'Kandidat', $2)", [cand, `k${i}@example.org`]);
    await db.query("insert into applications (id, vacancy_id, candidate_id, status) values ($1, $2, $3, 'screening')", [app, VAC, cand]);
  }
  await db.query("insert into application_attribution (application_id, entry_point, channel) values ($1, 'career_page', null), ($2, 'jobboard', 'meta')", [APP, APP2]);
});
afterAll(async () => db?.end());

describe("team roles", () => {
  it("lets viewers read but not change vacancies or the career page", async () => {
    await asUser(db, VIEWER, async (c) => {
      expect((await c.query("select title from vacancies")).rows).toEqual([{ title: "Busfahrer" }]);
      expect(await errorOf(c, () => c.query("insert into vacancies (organization_id, title) values ($1, 'Neu')", [ORG]))).toMatch(/row-level security/);
      expect(await errorOf(c, () => c.query("insert into referrers (organization_id, name, code) values ($1, 'X', 'abcd12345')", [ORG]))).toMatch(/row-level security/);
    });
    await asUser(db, OWNER, async (c) => {
      await c.query("insert into vacancies (organization_id, title) values ($1, 'Neu')", [ORG]);
    });
  });

  it("shows the team to its members only and keeps the last owner", async () => {
    await asUser(db, VIEWER, async (c) => {
      const team = (await c.query("select full_name, email, member_role from org_team($1)", [ORG])).rows;
      expect(team).toEqual([{ full_name: "Olaf Owner", email: "owner@kunde.de", member_role: "owner" }, { full_name: "Vera Fach", email: "fach@kunde.de", member_role: "viewer" }]);
    });
    await asUser(db, OUTSIDER, async (c) => {
      expect((await c.query("select * from org_team($1)", [ORG])).rows).toEqual([]);
      expect(await errorOf(c, () => c.query("select user_id_by_email('owner@kunde.de')"))).toMatch(/permission denied/);
    });
    await db.query("begin");
    try {
      expect(await errorOf(db, () => db.query("update customer_members set member_role = 'member' where profile_id = $1", [OWNER]))).toMatch(/last_owner/);
      expect(await errorOf(db, () => db.query("delete from customer_members where profile_id = $1", [OWNER]))).toMatch(/last_owner/);
    } finally {
      await db.query("rollback");
    }
    expect((await db.query("select user_id_by_email('OWNER@kunde.de') as id")).rows[0].id).toBe(OWNER);
  });
});

describe("shortlist notification", () => {
  it("mails owners and members once per vacancy, or only the vacancy's contacts", async () => {
    await db.query("update applications set status = 'shortlisted' where id = $1", [APP]);
    expect((await mails("team_shortlist")).map((m) => m.to_email)).toEqual(["owner@kunde.de"]);
    await db.query("delete from mail_outbox");
    await db.query("insert into vacancy_contacts (vacancy_id, profile_id) values ($1, $2)", [VAC, VIEWER]);
    await db.query("update applications set status = 'shortlisted' where id = $1", [APP2]);
    expect((await mails("team_shortlist")).map((m) => m.to_email)).toEqual(["fach@kunde.de"]);
  });
});

describe("comments", () => {
  it("sets the author, filters mentions and notifies", async () => {
    await asUser(db, VIEWER, async (c) => {
      await c.query("insert into application_comments (application_id, author_id, body, mentions) values ($1, $2, 'Passt gut, @Olaf schau mal', $3)", [APP, VIEWER, [OWNER, OUTSIDER]]);
      await c.query("reset role");
      const row = (await c.query("select author_name, author_side, mentions from application_comments")).rows[0];
      expect(row).toEqual({ author_name: "Vera Fach", author_side: "customer", mentions: [OWNER] });
      const m = await mails("team_mention");
      expect(m.map((x) => x.to_email)).toEqual(["owner@kunde.de"]);
      expect(m[0].data).toMatchObject({ author: "Vera Fach", candidate: "Kai K.", jobTitle: "Busfahrer" });
    });
  });

  it("sends questions to recrewted, hides internal notes from the customer", async () => {
    await db.query("begin");
    try {
      await db.query("delete from mail_outbox");
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [OWNER]);
      await db.query("insert into application_comments (application_id, author_id, body, kind) values ($1, $2, 'Gehaltsvorstellung?', 'question')", [APP, OWNER]);
      expect(await errorOf(db, () => db.query("insert into application_comments (application_id, author_id, body, kind) values ($1, $2, 'x', 'internal')", [APP, OWNER]))).toMatch(/row-level security/);
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [RECRUITER]);
      await db.query("insert into application_comments (application_id, author_id, body, kind, mentions) values ($1, $2, 'Intern: Referenz fehlt', 'internal', $3)", [APP, RECRUITER, [OWNER]]);
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [OWNER]);
      expect((await db.query("select kind from application_comments order by created_at")).rows.map((r) => r.kind)).toEqual(["question"]);
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [OUTSIDER]);
      expect((await db.query("select * from application_comments")).rows).toEqual([]);
      expect((await db.query("select * from mentionable($1)", [APP])).rows).toEqual([]);
      await db.query("reset role");
      expect((await mails("team_mention")).map((x) => x.to_email)).toEqual(["rec@recrewted.de"]);
      expect((await db.query("select mentions from application_comments where kind = 'internal'")).rows[0].mentions).toEqual([]);
    } finally {
      await db.query("rollback");
    }
  });
});

describe("dashboard", () => {
  it("aggregates per vacancy for members, nothing for others", async () => {
    await asUser(db, VIEWER, async (c) => {
      const r = (await c.query("select applications, shortlisted, sources from employer_dashboard($1) where vacancy_id = $2", [ORG, VAC])).rows[0];
      expect(r).toEqual({ applications: "2", shortlisted: "2", sources: { career_page: 1, meta: 1 } });
    });
    await asUser(db, OUTSIDER, async (c) => {
      expect((await c.query("select * from employer_dashboard($1)", [ORG])).rows).toEqual([]);
    });
  });

  it("shows benchmarks only with enough other customers", async () => {
    await asUser(db, OWNER, async (c) => {
      expect((await c.query("select * from employer_benchmarks($1)", [ORG])).rows).toEqual([]);
    });
  });
});

describe("vacancy request", () => {
  it("mails recrewted when a customer submits a briefing", async () => {
    await db.query("delete from mail_outbox");
    const DRAFT = "20000000-0000-0000-0000-0000000000d1";
    await db.query("insert into vacancies (id, organization_id, title) values ($1, $2, 'Busfahrer')", [DRAFT, ORG]);
    await db.query("insert into vacancy_briefings (vacancy_id, data) values ($1, '{}')", [DRAFT]);
    await asUser(db, OWNER, async (c) => {
      await c.query("update vacancy_briefings set submitted_at = now() where vacancy_id = $1", [DRAFT]);
      await c.query("reset role");
      const m = await mails("vacancy_request");
      expect(m.map((x) => x.to_email)).toEqual(["rec@recrewted.de"]);
      expect(m[0].data).toMatchObject({ organization: "Kunde", jobTitle: "Busfahrer" });
    });
  });
});
