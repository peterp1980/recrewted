// Career pages: settings on organizations (0011/0012/0013), content documents with draft and review (0014).
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const OTHER = "00000000-0000-0000-0000-0000000000c2";
const ORG = "10000000-0000-0000-0000-00000000000a";
const ORG_B = "10000000-0000-0000-0000-00000000000b";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_career_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1), ($2), ($3)", [ADMIN, CUSTOMER, OTHER]);
  await db.query("update profiles set role = 'admin' where id = $1", [ADMIN]);
  await db.query("insert into organizations (id, name) values ($1, 'A'), ($2, 'B')", [ORG, ORG_B]);
  await db.query("insert into customer_members values ($1, $2), ($3, $4)", [ORG, CUSTOMER, ORG_B, OTHER]);
});
afterAll(async () => db?.end());

const doc = (headline: string) => JSON.stringify({ v: 1, sections: [{ id: "hero", type: "hero", visible: true, data: { headline } }] });

describe("career page settings", () => {
  it("accepts a valid profile", () =>
    asUser(db, ADMIN, async (c) => {
      await c.query("update organizations set slug = 'projx', career_enabled = true, brand_color = '#4dc3cb', candidate_tone = 'du' where id = $1", [ORG]);
      expect((await c.query("select slug, career_enabled, candidate_tone from organizations where id = $1", [ORG])).rows[0]).toEqual({ slug: "projx", career_enabled: true, candidate_tone: "du" });
    }));

  it("rejects invalid slugs, colours, tones and publishing without a slug", () =>
    asUser(db, ADMIN, async (c) => {
      expect(await errorOf(c, () => c.query("update organizations set slug = 'Projx GmbH' where id = $1", [ORG]))).toMatch(/check constraint/);
      expect(await errorOf(c, () => c.query("update organizations set slug = '-projx' where id = $1", [ORG]))).toMatch(/check constraint/);
      expect(await errorOf(c, () => c.query("update organizations set brand_color = 'teal' where id = $1", [ORG]))).toMatch(/check constraint/);
      expect(await errorOf(c, () => c.query("update organizations set candidate_tone = 'ihr' where id = $1", [ORG]))).toMatch(/check constraint/);
      expect(await errorOf(c, () => c.query("update organizations set career_enabled = true where id = $1", [ORG]))).toMatch(/career_needs_slug/);
    }));

  it("creates the public bucket for career images (images only)", async () => {
    const r = await db.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'career-media'");
    expect(r.rows[0]).toEqual({ public: true, file_size_limit: "5242880", allowed_mime_types: ["image/jpeg", "image/png", "image/webp"] });
  });

  it("does not let customers change their own settings", () =>
    asUser(db, CUSTOMER, async (c) => {
      const r = await c.query("update organizations set slug = 'hijack' where id = $1", [ORG]);
      expect(r.rowCount).toBe(0);
    }));
});

describe("career page documents", () => {
  it("exists for every organization, also for new ones", async () => {
    await db.query("begin");
    await db.query("insert into organizations (name) values ('Neu')");
    const r = await db.query("select count(*)::int as n from organizations o left join career_pages p on p.organization_id = o.id where p.organization_id is null");
    expect(r.rows[0].n).toBe(0);
    await db.query("rollback");
  });

  it("lets customers edit their draft and submit it for review", () =>
    asUser(db, CUSTOMER, async (c) => {
      const r = await c.query("update career_pages set draft = $2, status = 'in_review', submitted_at = now(), submitted_by = $3 where organization_id = $1", [ORG, doc("Neu"), CUSTOMER]);
      expect(r.rowCount).toBe(1);
      const row = (await c.query("select status, updated_by, draft -> 'sections' -> 0 -> 'data' ->> 'headline' as h from career_pages where organization_id = $1", [ORG])).rows[0];
      expect(row).toEqual({ status: "in_review", updated_by: CUSTOMER, h: "Neu" });
    }));

  it("does not let customers publish", () =>
    asUser(db, CUSTOMER, async (c) => {
      expect(await errorOf(c, () => c.query("update career_pages set published = draft where organization_id = $1", [ORG]))).toMatch(/publish_requires_staff/);
      expect(await errorOf(c, () => c.query("update career_pages set status = 'published' where organization_id = $1", [ORG]))).toMatch(/publish_requires_staff/);
    }));

  it("lets customers discard their draft (back to the published version)", async () => {
    await db.query("update career_pages set published = $2, draft = $3, status = 'draft' where organization_id = $1", [ORG, doc("Live"), doc("Entwurf")]);
    await asUser(db, CUSTOMER, async (c) => {
      await c.query("update career_pages set draft = published, status = 'published' where organization_id = $1", [ORG]);
      expect((await c.query("select status, draft -> 'sections' -> 0 -> 'data' ->> 'headline' as h from career_pages where organization_id = $1", [ORG])).rows[0]).toEqual({ status: "published", h: "Live" });
    });
    await db.query("update career_pages set published = null, draft = '{}', status = 'draft' where organization_id = $1", [ORG]);
  });

  it("hides other customers' pages", () =>
    asUser(db, OTHER, async (c) => {
      expect((await c.query("select organization_id from career_pages")).rows).toEqual([{ organization_id: ORG_B }]);
      expect((await c.query("update career_pages set draft = '{}' where organization_id = $1", [ORG])).rowCount).toBe(0);
    }));

  it("lets staff publish", () =>
    asUser(db, ADMIN, async (c) => {
      await c.query("update career_pages set published = draft, status = 'published', published_at = now(), published_by = $2 where organization_id = $1", [ORG, ADMIN]);
      expect((await c.query("select status from career_pages where organization_id = $1", [ORG])).rows[0].status).toBe("published");
    }));

  it("keeps documents objects", () =>
    asUser(db, ADMIN, async (c) => {
      expect(await errorOf(c, () => c.query("update career_pages set draft = '[]' where organization_id = $1", [ORG]))).toMatch(/check constraint/);
    }));
});
