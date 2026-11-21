import { describe, expect, it } from "vitest";
import { canEdit, canManage, parseColleague } from "./roles";

const form = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

describe("team roles", () => {
  it("separates managing, editing and reading", () => {
    expect([canManage("owner"), canManage("member"), canEdit("member"), canEdit("viewer"), canEdit(null)]).toEqual([true, false, true, false, false]);
  });
  it("validates invitations", () => {
    expect(parseColleague(form({ email: " Anna@Firma.DE ", fullName: "Anna  Schmidt", memberRole: "viewer" }))).toEqual({ ok: true, value: { email: "anna@firma.de", fullName: "Anna Schmidt", role: "viewer" } });
    expect(parseColleague(form({ email: "anna", fullName: "Anna", memberRole: "viewer" }))).toEqual({ ok: false, error: "email" });
    expect(parseColleague(form({ email: "a@b.de", fullName: "A", memberRole: "viewer" }))).toEqual({ ok: false, error: "fullName" });
    expect(parseColleague(form({ email: "a@b.de", fullName: "Anna", memberRole: "admin" }))).toEqual({ ok: false, error: "role" });
  });
});
