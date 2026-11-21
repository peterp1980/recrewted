import { describe, expect, it } from "vitest";
import { emptyBriefing, type Briefing } from "@/lib/briefing/schema";
import { checkAd, generateAd, TEMPLATES, withGenderTag, type TemplateKey } from "./generator";

const b: Briefing = {
  ...emptyBriefing(), title: "Elektroniker", employmentType: "full_time", location: "München", postalCode: "80331",
  tasks: ["Wartung von Anlagen"], mustHave: ["Ausbildung als Elektroniker"], benefits: ["30 Tage Urlaub"],
  salaryMin: 42000, salaryMax: 52000,
};

describe("job ad generator", () => {
  it("adds the gender tag once", () => {
    expect(withGenderTag("Elektroniker")).toBe("Elektroniker (m/w/d)");
    expect(withGenderTag("Elektroniker (w/m/d)")).toBe("Elektroniker (w/m/d)");
  });

  it.each(Object.keys(TEMPLATES) as TemplateKey[])("template %s passes all checks", (key) => {
    const ad = generateAd(key, { briefing: b, employer: "Muster GmbH" });
    expect(checkAd(ad, TEMPLATES[key].channel, b)).toEqual([]);
    expect(ad.body).toContain("München");
  });

  it("finds missing tag, salary, location and AGG wording", () => {
    const issues = checkAd({ title: "Elektroniker", body: "Junges Team sucht Verstärkung." }, "portal", { ...b, salaryMax: null });
    expect(issues.map((i) => i.kind)).toEqual(["gender_tag", "salary", "location", "agg"]);
  });

  it("limits social texts", () => {
    expect(checkAd({ title: "X (m/w/d)", body: `München 1 € ${"x".repeat(600)}` }, "social", b).map((i) => i.kind)).toEqual(["too_long"]);
  });
});
