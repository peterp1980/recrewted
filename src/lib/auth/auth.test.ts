import { describe, expect, it } from "vitest";
import { canAccess, homeFor, isStaff } from "./roles";
import { isProtected, safeNext } from "./redirect";

describe("roles", () => {
  it("sends staff to /admin and customers to /portal", () => {
    expect(homeFor("admin")).toBe("/admin");
    expect(homeFor("recruiter")).toBe("/admin");
    expect(homeFor("customer")).toBe("/portal");
    expect(homeFor(null)).toBe("/portal");
  });

  it("knows who is staff", () => {
    expect(isStaff("admin")).toBe(true);
    expect(isStaff("recruiter")).toBe(true);
    expect(isStaff("customer")).toBe(false);
    expect(isStaff(undefined)).toBe(false);
  });

  it("restricts areas by role", () => {
    expect(canAccess("admin", "/admin/users")).toBe(true);
    expect(canAccess("recruiter", "/admin/users")).toBe(false);
    expect(canAccess("recruiter", "/admin")).toBe(true);
    expect(canAccess("customer", "/admin")).toBe(false);
    expect(canAccess("customer", "/portal")).toBe(true);
    expect(canAccess("admin", "/portal")).toBe(false);
    expect(canAccess("customer", "/administrator")).toBe(true); // not the admin area
  });
});

describe("redirects", () => {
  it("allows only relative same-site paths", () => {
    expect(safeNext("/portal")).toBe("/portal");
    expect(safeNext("/admin/users?x=1")).toBe("/admin/users?x=1");
    expect(safeNext("https://evil.example")).toBeNull();
    expect(safeNext("//evil.example")).toBeNull();
    expect(safeNext("/\\evil.example")).toBeNull();
    expect(safeNext("/a\nb")).toBeNull();
    expect(safeNext("")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });

  it("protects admin and portal only", () => {
    expect(isProtected("/admin")).toBe(true);
    expect(isProtected("/admin/users")).toBe(true);
    expect(isProtected("/portal")).toBe(true);
    expect(isProtected("/login")).toBe(false);
    expect(isProtected("/")).toBe(false);
    expect(isProtected("/portalx")).toBe(false);
  });
});
