// AI configuration. Recruiting AI is high-risk under the EU AI Act (Annex III no. 4):
// it only suggests, a person decides, and everything is logged (see docs/ki.md).
//
// Env:
//   AI_ENABLED=true            global switch (off by default)
//   AI_PROVIDER=bedrock        "bedrock" (Claude in Amazon Bedrock, region below; default, EU) or
//                              "anthropic" (Claude API; no EU-only processing – only after DPO approval)
//   AI_AWS_REGION=eu-central-1 Bedrock region (Frankfurt)
//   AI_MODEL=claude-opus-5-5   model id without provider prefix

export type AiProvider = "bedrock" | "anthropic";
export type AiConfig = { provider: AiProvider; model: string; region: string };

export const DEFAULT_MODEL = "claude-opus-5-5";

export function aiConfig(env: Record<string, string | undefined> = process.env): AiConfig | null {
  if (env.AI_ENABLED !== "true") return null;
  const provider: AiProvider = env.AI_PROVIDER === "anthropic" ? "anthropic" : "bedrock";
  const model = (env.AI_MODEL || DEFAULT_MODEL).replace(/^anthropic\./, "");
  if (!/^claude-[a-z0-9-]+$/.test(model)) return null;
  return { provider, model, region: env.AI_AWS_REGION || "eu-central-1" };
}

/** Bedrock model ids carry the "anthropic." prefix; the Claude API takes the bare id. */
export const modelId = (c: AiConfig) => (c.provider === "bedrock" ? `anthropic.${c.model}` : c.model);

/** What we write into the log: provider, region and model, so a suggestion can be traced back. */
export const modelLabel = (c: AiConfig) => `${c.provider}:${c.provider === "bedrock" ? `${c.region}:` : ""}${modelId(c)}`;
