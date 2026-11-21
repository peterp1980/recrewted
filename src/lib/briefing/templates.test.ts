import { describe, expect, it } from "vitest";
import { findAggIssues } from "@/lib/agg";
import { briefingFromTemplate, findTemplate, ROLE_TEMPLATES } from "./templates";

describe("role templates", () => {
  it("are unique and pass the AGG check", () => {
    expect(new Set(ROLE_TEMPLATES.map((t) => t.id)).size).toBe(ROLE_TEMPLATES.length);
    for (const t of ROLE_TEMPLATES) {
      expect(findAggIssues([t.title, ...t.tasks, ...t.mustHave, ...t.niceToHave, ...t.benefits].join("\n")), t.id).toEqual([]);
      expect(t.title).toMatch(/\(m\/w\/d\)/);
    }
  });
  it("prefills the briefing, own title first", () => {
    const b = briefingFromTemplate(findTemplate("busfahrer"), "Busfahrer (m/w/d) Reiseverkehr");
    expect(b.title).toBe("Busfahrer (m/w/d) Reiseverkehr");
    expect(b.mustHave).toContain("Fahrerkarte und Schlüsselzahl 95");
    expect(briefingFromTemplate(findTemplate("busfahrer"), "").title).toBe("Busfahrer (m/w/d)");
    expect(briefingFromTemplate(findTemplate("nope"), "X").tasks).toEqual([]);
  });
});
