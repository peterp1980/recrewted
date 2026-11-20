import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const root = join(import.meta.dirname, "..");

/** Connection to the Postgres server used for tests (admin rights needed to create a database). */
export const adminUrl = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:54329/postgres";

export type Role = "anon" | "authenticated";

/** Creates a fresh database, loads the Supabase stub and applies all migrations in order. */
export async function createTestDatabase(name: string): Promise<string> {
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`drop database if exists ${name} with (force)`);
  await admin.query(`create database ${name}`);
  await admin.end();

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const db = new Client({ connectionString: url.toString() });
  await db.connect();
  await db.query(readFileSync(join(root, "tests", "supabase-stub.sql"), "utf8"));
  const migrations = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const file of migrations) {
    await db.query(readFileSync(join(root, "migrations", file), "utf8"));
  }
  await db.end();
  return url.toString();
}

/**
 * Runs `fn` inside a transaction as the given API role and user, like a
 * request through Supabase's API would. The transaction is always rolled back.
 */
export async function asUser<T>(
  client: Client,
  userId: string | null,
  fn: (c: Client) => Promise<T>,
  role: Role = "authenticated",
): Promise<T> {
  await client.query("begin");
  try {
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    return await fn(client);
  } finally {
    await client.query("rollback");
  }
}

/** Returns the error message if `fn` fails, otherwise null. Uses a savepoint so the transaction survives. */
export async function errorOf(client: Client, fn: () => Promise<unknown>): Promise<string | null> {
  await client.query("savepoint probe");
  try {
    await fn();
    await client.query("release savepoint probe");
    return null;
  } catch (e) {
    await client.query("rollback to savepoint probe");
    return (e as Error).message;
  }
}
