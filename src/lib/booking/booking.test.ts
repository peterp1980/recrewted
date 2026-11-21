import { describe, expect, it } from "vitest";
import { signProfileToken } from "@/lib/profile/token";
import { berlinToUtc, byDay, icsFile, series, whenLabel } from "./format";
import { signBookingToken, verifyBookingToken } from "./token";

const ID = "50000000-0000-0000-0000-000000000001";

describe("booking token", () => {
  it("verifies, expires and is not interchangeable with profile links", () => {
    const t = signBookingToken(ID, "s", 0);
    expect(verifyBookingToken(t, "s", 1000)).toBe(ID);
    expect(verifyBookingToken(t, "s", 31 * 86_400_000)).toBeNull();
    expect(verifyBookingToken(t, "other", 1000)).toBeNull();
    expect(verifyBookingToken(signProfileToken(ID, "s", 0), "s", 1000)).toBeNull();
  });
});

describe("times", () => {
  it("converts German local time in summer and winter", () => {
    expect(berlinToUtc("2026-07-01", "10:00")?.toISOString()).toBe("2026-07-01T08:00:00.000Z");
    expect(berlinToUtc("2026-12-01", "10:00")?.toISOString()).toBe("2026-12-01T09:00:00.000Z");
    expect(berlinToUtc("2026-12-01", "25:00")).toBeNull();
    expect(whenLabel("2026-12-01T09:00:00Z")).toBe("Dienstag, 1. Dezember, 10:00 Uhr");
  });
  it("groups by German day and builds series", () => {
    const g = byDay([{ starts_at: "2026-12-01T23:30:00Z" }, { starts_at: "2026-12-01T09:00:00Z" }]);
    expect(g.map((d) => [d.day, d.slots.length])).toEqual([["2026-12-01", 1], ["2026-12-02", 1]]);
    expect(series(new Date("2026-12-01T09:00:00Z"), 30, 3, 15).map((d) => d.toISOString())).toEqual(["2026-12-01T09:00:00.000Z", "2026-12-01T09:45:00.000Z", "2026-12-01T10:30:00.000Z"]);
    expect(series(new Date(0), 30, 99)).toHaveLength(20);
  });
  it("writes a valid calendar entry with escaped text", () => {
    const ics = icsFile({ uid: "b1", startsAt: "2026-12-01T09:00:00Z", minutes: 45, title: "Kennenlernen; Busfahrer", location: "Landsberger Str. 72, München", description: "Bitte\nFührerschein mitbringen" });
    expect(ics).toContain("DTSTART:20261201T090000Z\r\nDTEND:20261201T094500Z");
    expect(ics).toContain("SUMMARY:Kennenlernen\; Busfahrer");
    expect(ics).toContain("LOCATION:Landsberger Str. 72\\, München");
    expect(ics).toContain("DESCRIPTION:Bitte\\nFührerschein mitbringen");
  });
});
