import { describe, expect, it } from "vitest";
import { parseInvite } from "./invite";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const ORG = "10000000-0000-4000-8000-00000000000a";

describe("parseInvite", () => {
  it("accepts a recruiter without organization", () => {
    const r = parseInvite(form({ email: " Anna@Projx.de ", fullName: "Anna Muster", role: "recruiter", organizationId: ORG }));
    expect(r).toEqual({ ok: true, value: { email: "anna@projx.de", fullName: "Anna Muster", role: "recruiter", organizationId: null, newOrganizationName: null } });
  });

  it("accepts a customer with an existing organization", () => {
    const r = parseInvite(form({ email: "k@kunde.de", fullName: "Kai Kunde", role: "customer", organizationId: ORG }));
    expect(r.ok && r.value.organizationId).toBe(ORG);
  });

  it("accepts a customer with a new organization", () => {
    const r = parseInvite(form({ email: "k@kunde.de", fullName: "Kai Kunde", role: "customer", newOrganizationName: "Kunde GmbH" }));
    expect(r.ok && r.value.newOrganizationName).toBe("Kunde GmbH");
  });

  it("requires exactly one organization for customers", () => {
    expect(parseInvite(form({ email: "k@kunde.de", fullName: "Kai Kunde", role: "customer" }))).toEqual({ ok: false, error: "organization" });
    expect(
      parseInvite(form({ email: "k@kunde.de", fullName: "Kai Kunde", role: "customer", organizationId: ORG, newOrganizationName: "Neu GmbH" })),
    ).toEqual({ ok: false, error: "organization" });
    expect(parseInvite(form({ email: "k@kunde.de", fullName: "Kai Kunde", role: "customer", organizationId: "x" }))).toEqual({ ok: false, error: "organization" });
  });

  it("rejects bad email, name and role", () => {
    expect(parseInvite(form({ email: "keine-mail", fullName: "Kai", role: "admin" }))).toEqual({ ok: false, error: "email" });
    expect(parseInvite(form({ email: "a@b.de", fullName: "K", role: "admin" }))).toEqual({ ok: false, error: "fullName" });
    expect(parseInvite(form({ email: "a@b.de", fullName: "Kai", role: "superuser" }))).toEqual({ ok: false, error: "role" });
  });
});
