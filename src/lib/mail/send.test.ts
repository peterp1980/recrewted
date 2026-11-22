import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("resend", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sends plain text through the Resend API with reply-to", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "recrewted <bewerbung@mail.recrewted.de>");
    vi.stubEnv("MAIL_REPLY_TO", "team@recrewted.de");
    const { sendMail, mailConfigured } = await import("./send");
    expect(mailConfigured()).toBe(true);
    const calls: { url: string; init: RequestInit }[] = [];
    const f = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ id: "m1" }), { status: 200 });
    }) as unknown as typeof fetch;
    await sendMail("kai@example.org", "Betreff", "Text", f);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ from: "recrewted <bewerbung@mail.recrewted.de>", to: ["kai@example.org"], subject: "Betreff", text: "Text", reply_to: "team@recrewted.de" });
  });

  it("reports errors with retry hint", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "x@y.de");
    const { sendMail } = await import("./send");
    const f = (async () => new Response(JSON.stringify({ message: "The domain is not verified" }), { status: 403 })) as unknown as typeof fetch;
    await expect(sendMail("a@b.de", "s", "t", f)).rejects.toMatchObject({ message: "Resend 403: The domain is not verified", retry: false });
  });
});
