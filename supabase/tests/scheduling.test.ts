// Scheduling and WhatsApp (0024).
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const OWNER = "00000000-0000-0000-0000-0000000000c1";
const VIEWER = "00000000-0000-0000-0000-0000000000c2";
const ORG = "10000000-0000-0000-0000-00000000000a";
const VAC = "20000000-0000-0000-0000-00000000000a";
const VAC_B = "20000000-0000-0000-0000-00000000000b";
const CAND = "40000000-0000-0000-0000-000000000001";
const CAND2 = "40000000-0000-0000-0000-000000000002";
const APP = "50000000-0000-0000-0000-000000000001";
const APP2 = "50000000-0000-0000-0000-000000000002";
const S1 = "60000000-0000-0000-0000-000000000001";
const S2 = "60000000-0000-0000-0000-000000000002";
const S_SOON = "60000000-0000-0000-0000-000000000003";
const S_OTHER = "60000000-0000-0000-0000-000000000004";
const S_TOMORROW = "60000000-0000-0000-0000-000000000005";
let db: Client;

const mails = async (template: string) => (await db.query("select to_email, data from mail_outbox where template = $1 and cancelled_at is null order by created_at, to_email", [template])).rows;
const err = async (sql: string, params: unknown[]) => {
  await db.query("begin");
  try {
    return await errorOf(db, () => db.query(sql, params));
  } finally {
    await db.query("rollback");
  }
};

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_scheduling_test") });
  await db.connect();
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'owner@kunde.de', '{\"full_name\":\"Olaf Owner\"}'), ($2, 'fach@kunde.de', '{}')", [OWNER, VIEWER]);
  await db.query("insert into organizations (id, name, candidate_tone) values ($1, 'Kunde', 'sie')", [ORG]);
  await db.query("insert into customer_members (organization_id, profile_id, member_role) values ($1, $2, 'owner'), ($1, $3, 'viewer')", [ORG, OWNER, VIEWER]);
  await db.query("insert into vacancies (id, organization_id, title, status, employer_visible) values ($1, $3, 'Busfahrer', 'active', true), ($2, $3, 'Andere', 'active', true)", [VAC, VAC_B, ORG]);
  await db.query("insert into candidates (id, first_name, last_name, email, whatsapp_opt_in_at, whatsapp_phone) values ($1, 'Kai', 'K', 'kai@example.org', now(), '+4915112345678'), ($2, 'Lea', 'L', 'lea@example.org', null, null)", [CAND, CAND2]);
  await db.query("insert into applications (id, vacancy_id, candidate_id, status) values ($1, $3, $4, 'shortlisted'), ($2, $3, $5, 'shortlisted')", [APP, APP2, VAC, CAND, CAND2]);
  await db.query(
    `insert into interview_slots (id, vacancy_id, starts_at, mode, location) values
     ($1, $5, now() + interval '3 days', 'onsite', 'Landsberger Str. 72'), ($2, $5, now() + interval '4 days', 'video', 'https://meet.example/x'),
     ($3, $5, now() + interval '1 hour', 'phone', null), ($4, $6, now() + interval '3 days', 'onsite', null)`,
    [S1, S2, S_SOON, S_OTHER, VAC, VAC_B],
  );
  await db.query("delete from mail_outbox");
});
afterAll(async () => db?.end());

describe("slots", () => {
  it("lets owners add slots, viewers only read", async () => {
    await asUser(db, OWNER, async (c) => {
      await c.query("insert into interview_slots (vacancy_id, starts_at) values ($1, now() + interval '5 days')", [VAC]);
    });
    await asUser(db, VIEWER, async (c) => {
      expect((await c.query("select count(*)::int as n from interview_slots where vacancy_id = $1", [VAC])).rows[0].n).toBe(3);
      expect(await errorOf(c, () => c.query("insert into interview_slots (vacancy_id, starts_at) values ($1, now() + interval '5 days')", [VAC]))).toMatch(/row-level security/);
    });
  });
});

describe("booking", () => {
  it("rejects slots that are too soon, of another vacancy or for closed applications", async () => {
    expect(await err("select book_slot($1, $2)", [APP, S_SOON])).toMatch(/slot_unavailable/);
    expect(await err("select book_slot($1, $2)", [APP, S_OTHER])).toMatch(/slot_unavailable/);
  });

  it("books once, sets the interview status, mails candidate and team, mirrors to WhatsApp", async () => {
    await db.query("select book_slot($1, $2)", [APP, S1]);
    expect((await db.query("select status from applications where id = $1", [APP])).rows[0].status).toBe("interview");
    expect((await mails("interview_booked")).map((m) => m.to_email)).toEqual(["kai@example.org"]);
    expect((await mails("interview_booked"))[0].data).toMatchObject({ firstName: "Kai", jobTitle: "Busfahrer", mode: "onsite", location: "Landsberger Str. 72", employer: "Kunde" });
    expect((await mails("team_booking")).map((m) => m.to_email)).toEqual(["owner@kunde.de"]);
    // The generic "we will get in touch" status mail is replaced by the booking confirmation.
    expect(await mails("status_update")).toEqual([]);
    const wa = (await db.query("select template, to_phone from whatsapp_outbox where cancelled_at is null")).rows;
    expect(wa).toEqual([{ template: "interview_booked", to_phone: "+4915112345678" }]);
    expect(await err("select book_slot($1, $2)", [APP2, S1])).toMatch(/slot_taken/);
  });

  it("rebooks more than 24 hours ahead and frees the old slot", async () => {
    await db.query("select book_slot($1, $2)", [APP, S2]);
    const active = (await db.query("select slot_id from interview_bookings where application_id = $1 and cancelled_at is null", [APP])).rows;
    expect(active).toEqual([{ slot_id: S2 }]);
    await db.query("select book_slot($1, $2)", [APP2, S1]);
  });

  it("does not let candidates cancel late; the team can, and the candidate is told", async () => {
    await db.query("insert into interview_slots (id, vacancy_id, starts_at) values ($1, $2, now() + interval '20 hours')", [S_TOMORROW, VAC]);
    await db.query("update interview_bookings set slot_id = $1 where application_id = $2 and cancelled_at is null", [S_TOMORROW, APP]);
    expect(await err("select cancel_booking($1, 'candidate')", [APP])).toMatch(/too_late/);
    expect((await db.query("select queue_interview_reminders() as n")).rows[0].n).toBe(1);
    expect((await mails("interview_reminder")).map((m) => m.to_email)).toEqual(["kai@example.org"]);
    expect((await db.query("select queue_interview_reminders() as n")).rows[0].n).toBe(0);
    await db.query("update interview_slots set cancelled_at = now() where id = $1", [S_TOMORROW]);
    expect((await mails("interview_cancelled")).map((m) => m.to_email)).toEqual(["kai@example.org"]);
    expect(await mails("interview_reminder")).toEqual([]);
    expect((await db.query("select count(*)::int as n from interview_bookings where application_id = $1 and cancelled_at is null", [APP])).rows[0].n).toBe(0);
  });

  it("only the server may book", () =>
    asUser(db, OWNER, async (c) => {
      expect(await errorOf(c, () => c.query("select book_slot($1, $2)", [APP, S2]))).toMatch(/permission denied/);
    }));
});

describe("whatsapp", () => {
  it("only for opted-in candidates; cancelling the mail cancels the message; claim skips revoked opt-ins", async () => {
    await db.query("delete from whatsapp_outbox; delete from mail_outbox");
    await db.query("insert into mail_outbox (candidate_id, to_email, template, data) values ($1, 'kai@example.org', 'status_update', '{}'), ($2, 'lea@example.org', 'status_update', '{}'), ($1, 'kai@example.org', 'profile_link', '{}')", [CAND, CAND2]);
    expect((await db.query("select count(*)::int as n from whatsapp_outbox")).rows[0].n).toBe(1);
    await db.query("update mail_outbox set cancelled_at = now() where template = 'status_update'");
    expect((await db.query("select count(*)::int as n from whatsapp_outbox where cancelled_at is null")).rows[0].n).toBe(0);
    await db.query("insert into mail_outbox (candidate_id, to_email, template, data) values ($1, 'kai@example.org', 'assessment_invite', '{}')", [CAND]);
    await db.query("update candidates set whatsapp_opt_in_at = null where id = $1", [CAND]);
    expect((await db.query("select * from claim_due_whatsapp(10)")).rows).toEqual([]);
  });

  it("exports interviews and WhatsApp for data requests", async () => {
    const e = (await db.query("select candidate_export($1) as e", [CAND])).rows[0].e;
    expect(e.interviews.length).toBeGreaterThan(0);
    expect(e.whatsapp_messages.length).toBeGreaterThan(0);
    expect(e.applications[0].job).toBe("Busfahrer");
  });
});
