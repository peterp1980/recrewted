import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Mail provider: Resend (HTTPS API, preferred) or any SMTP server.
//   Resend: RESEND_API_KEY, MAIL_FROM (e.g. "recrewted <bewerbung@mail.recrewted.de>"), optional MAIL_REPLY_TO
//   SMTP:   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
// Without either, mails stay queued in mail_outbox and nothing is sent.

const resendKey = () => process.env.RESEND_API_KEY || null;

export function mailConfigured(): boolean {
  return Boolean(process.env.MAIL_FROM && (resendKey() || process.env.SMTP_HOST));
}

export class MailError extends Error {
  constructor(message: string, readonly retry: boolean) {
    super(message);
  }
}

async function sendViaResend(key: string, to: string, subject: string, text: string, f: typeof fetch = fetch): Promise<string | null> {
  const res = await f("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text, ...(process.env.MAIL_REPLY_TO ? { reply_to: process.env.MAIL_REPLY_TO } : {}) }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
  if (!res.ok) throw new MailError(`Resend ${res.status}: ${body.message ?? body.name ?? "unbekannt"}`.slice(0, 300), res.status === 429 || res.status >= 500);
  return body.id ?? null;
}

let transport: Transporter | null = null;

export async function sendMail(to: string, subject: string, text: string, f?: typeof fetch): Promise<void> {
  if (!mailConfigured()) throw new Error("mail not configured");
  const key = resendKey();
  if (key) {
    await sendViaResend(key, to, subject, text, f);
    return;
  }
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM, replyTo: process.env.MAIL_REPLY_TO || undefined, to, subject, text });
}
