import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// SMTP settings come from environment variables. Until a provider is chosen
// (EU hosting, DPA), mails stay queued in mail_outbox and nothing is sent.

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

let transport: Transporter | null = null;

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  if (!mailConfigured()) throw new Error("SMTP not configured");
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM, replyTo: process.env.MAIL_REPLY_TO || undefined, to, subject, text });
}
