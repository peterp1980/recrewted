import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
const { stateOf } = await import("./manage");

describe("account state", () => {
  it("knows locked, invited and active", () => {
    expect(stateOf({ banned_until: "2999-01-01T00:00:00Z", last_sign_in_at: "2026-11-01T00:00:00Z" })).toBe("locked");
    expect(stateOf({ banned_until: "2020-01-01T00:00:00Z", last_sign_in_at: null, invited_at: "2026-11-01T00:00:00Z" })).toBe("invited");
    expect(stateOf({ last_sign_in_at: "2026-11-01T00:00:00Z" })).toBe("active");
  });
});
