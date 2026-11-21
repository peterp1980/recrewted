import "server-only";
import { siteUrl } from "@/lib/site";
import { signBookingToken, verifyBookingToken } from "./token";

const secret = () => process.env.DATA_REQUEST_SECRET ?? null;

export function bookingUrl(applicationId: string): string | null {
  const s = secret();
  return s ? `${siteUrl()}/termin/${signBookingToken(applicationId, s)}` : null;
}

export function applicationFromBookingToken(token: string): string | null {
  const s = secret();
  return s ? verifyBookingToken(token, s) : null;
}

const NEEDS_LINK = new Set(["booking_invite", "interview_booked", "interview_cancelled", "interview_reminder"]);

/** Mails queued by the database carry no link (it cannot sign); the personal link is added when sending. */
export function withBookingLink<T extends { link?: string | null; applicationId?: string }>(template: string, data: T): T {
  if (!NEEDS_LINK.has(template) || data.link || !data.applicationId) return data;
  return { ...data, link: bookingUrl(data.applicationId) };
}
