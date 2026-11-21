import { describe, expect, it } from "vitest";
import { readEntries } from "./audit-entry";

describe("readEntries", () => {
  it("creates one read entry per distinct record", () => {
    expect(readEntries("u1", "candidates", ["a", "b", "a"], "shortlist")).toEqual([
      { actor: "u1", action: "read", table_name: "candidates", record_id: "a", details: { view: "shortlist" } },
      { actor: "u1", action: "read", table_name: "candidates", record_id: "b", details: { view: "shortlist" } },
    ]);
  });

  it("creates nothing for an empty list", () => {
    expect(readEntries("u1", "applications", [], "pipeline")).toEqual([]);
  });
});
