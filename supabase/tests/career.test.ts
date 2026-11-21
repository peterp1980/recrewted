// Career pages: profile columns on organizations, only admins may change them.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createTestDatabase, errorOf } from "./db";

const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const ORG = "10000000-0000-0000-0000-00000000000a";
let db: Client;

beforeAll(async () => {
  db = new Client({ connectionString: await createTestDatabase("recrewted_career_test") });
  await db.connect();
  await db.query("insert into auth.users (id) values ($1), ($2)", [ADMIN, CUSTOMER]);
  await db.query("update profiles set role = 'admin' where id = $1", [ADMIN]);
  await db.query("insert into organizations (id, name) values ($1, 'A')", [ORG]);
  await db.query("insert into customer_members values ($1, $2)", [ORG, CUSTOMER]);
});
afterAll(async () => db?.end());

describe("career page profile", () => {
  it("accepts a valid profile", () =>
    asUser(db, ADMIN, async (c) => {
      await c.query(
        "update organizations set slug = 'projx', career_enabled = true, career_headline = 'Karriere', career_benefits = $2, brand_color = '#4dc3cb' where id = $1",
        [ORG, JSON.stringify([{ title: "Weiterbildung", text: "Intern und extern" }])],
      );
      expect((await c.query("select slug, career_enabled from organizations where id = $1", [ORG])).rows[0]).toEqual({ slug: "projx", career_enabled: true });
    }));

  it("rejects invalid slugs and colours, and publishing without a slug", () =>
    asUser(db, ADMIN, async (c) => {
      expect(await errorOf(c, () => c.query("update organizations set slug = 'Projx GmbH' where id = $1", [ORG]))).toMatch(/check constraint/);
      expect(await errorOf(c, () => c.query("update organizations set slug = '-projx' where id = $1", [ORG]))).toMatch(/check constraint/);
      expect(await errorOf(c, () => c.query("update organizations set brand_color = 'teal' where id = $1", [ORG]))).toMatch(/check constraint/);
      expect(await errorOf(c, () => c.query("update organizations set career_enabled = true where id = $1", [ORG]))).toMatch(/career_needs_slug/);
    }));

  it("defaults to the formal address and accepts only sie/du", () =>
    asUser(db, ADMIN, async (c) => {
      expect((await c.query("select candidate_tone from organizations where id = $1", [ORG])).rows[0].candidate_tone).toBe("sie");
      await c.query("update organizations set candidate_tone = 'du' where id = $1", [ORG]);
      expect(await errorOf(c, () => c.query("update organizations set candidate_tone = 'ihr' where id = $1", [ORG]))).toMatch(/check constraint/);
    }));

  it("stores images, facts and quotes; image links must be https or site-relative", () =>
    asUser(db, ADMIN, async (c) => {
      await c.query(
        "update organizations set career_hero_url = 'https://x.supabase.co/storage/v1/object/public/career-media/a.jpg', career_logo_url = '/cases/hafermann.png', career_facts = $2, career_testimonials = $3 where id = $1",
        [ORG, JSON.stringify([{ value: "111 Jahre", label: "Tradition" }]), JSON.stringify([{ quote: "Gern hier.", name: "A", role: "B" }])],
      );
      expect(await errorOf(c, () => c.query("update organizations set career_hero_url = 'javascript:alert(1)' where id = $1", [ORG]))).toMatch(/check constraint/);
      expect(await errorOf(c, () => c.query("update organizations set career_facts = '{}' where id = $1", [ORG]))).toMatch(/check constraint/);
    }));

  it("creates the public bucket for career images", async () => {
    const r = await db.query("select public, file_size_limit from storage.buckets where id = 'career-media'");
    expect(r.rows[0]).toEqual({ public: true, file_size_limit: "5242880" });
  });

  it("does not let customers change their own profile", () =>
    asUser(db, CUSTOMER, async (c) => {
      const r = await c.query("update organizations set slug = 'hijack' where id = $1", [ORG]);
      expect(r.rowCount).toBe(0);
    }));
});
