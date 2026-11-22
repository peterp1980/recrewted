import { generateKeyPairSync, createVerify } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { indexingConfig, notifyGoogle, resetTokenCache, signedJwt } from "./indexing";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const c = { email: "indexing@recrewted.iam.gserviceaccount.com", key: pem };

describe("google indexing", () => {
  beforeEach(resetTokenCache);

  it("reads the key with escaped newlines", () => {
    expect(indexingConfig({})).toBeNull();
    expect(indexingConfig({ GOOGLE_INDEXING_CLIENT_EMAIL: c.email, GOOGLE_INDEXING_PRIVATE_KEY: pem.replace(/\n/g, "\\n") })?.key).toBe(pem);
  });

  it("signs a JWT Google can verify", () => {
    const jwt = signedJwt(c, 1_800_000_000);
    const [h, p, s] = jwt.split(".");
    expect(JSON.parse(Buffer.from(p, "base64url").toString())).toMatchObject({ iss: c.email, scope: "https://www.googleapis.com/auth/indexing", exp: 1_800_003_600 });
    expect(createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(s, "base64url"))).toBe(true);
  });

  it("gets a token once and reports URLs", async () => {
    const f = vi.fn(async (url: string, _i?: RequestInit) =>
      url.includes("oauth2") ? new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 })) : new Response("{}", { status: 200 }));
    await notifyGoogle("https://recrewted.de/jobs/a--1", "updated", c, f as unknown as typeof fetch);
    await notifyGoogle("https://recrewted.de/jobs/b--2", "deleted", c, f as unknown as typeof fetch);
    expect(f.mock.calls.filter(([u]) => u.includes("oauth2"))).toHaveLength(1);
    const pub = f.mock.calls.filter(([u]) => u.includes("indexing.googleapis"));
    expect(JSON.parse(String(pub[1][1]!.body))).toEqual({ url: "https://recrewted.de/jobs/b--2", type: "URL_DELETED" });
    expect((pub[0][1]!.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("explains a missing Search Console ownership", async () => {
    const f = (async (url: string) => (url.includes("oauth2") ? new Response(JSON.stringify({ access_token: "t" })) : new Response("{}", { status: 403 }))) as unknown as typeof fetch;
    await expect(notifyGoogle("https://recrewted.de/jobs/x--1", "updated", c, f)).rejects.toMatchObject({ retry: false, message: expect.stringContaining("Search Console") });
  });
});
