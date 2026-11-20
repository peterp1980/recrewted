import { describe, expect, it } from "vitest";
import { getMessages } from "./index";

describe("i18n", () => {
  it("has non-empty German strings", () => {
    const walk = (o: object): string[] =>
      Object.values(o).flatMap((v) => (typeof v === "string" ? [v] : walk(v)));
    const strings = walk(getMessages());
    expect(strings.length).toBeGreaterThan(0);
    expect(strings.every((s) => s.trim().length > 0)).toBe(true);
  });
});
