import { describe, expect, it } from "vitest";
import { signBookingToken } from "@/lib/booking/token";
import { signSurveyToken, verifySurveyToken } from "./token";

const ID = "50000000-0000-0000-0000-000000000001";
describe("survey token", () => {
  it("verifies, expires, and is not a booking link", () => {
    expect(verifySurveyToken(signSurveyToken(ID, "s", 0), "s", 1000)).toBe(ID);
    expect(verifySurveyToken(signSurveyToken(ID, "s", 0), "s", 31 * 86_400_000)).toBeNull();
    expect(verifySurveyToken(signBookingToken(ID, "s", 0), "s", 1000)).toBeNull();
  });
});
