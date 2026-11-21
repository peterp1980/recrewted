import "server-only";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { aiConfig, modelId, modelLabel, type AiConfig } from "./config";
import { PROMPTS, type AiKind } from "./prompts";

// One AI call = one log entry (EU AI Act: logs, traceability, human oversight).
// The suggestion is stored with model, prompt version, input hash and time; the person's decision
// is recorded on the same row later (decideRecommendation).

let client: Anthropic | AnthropicBedrockMantle | null = null;
let clientKey = "";
function getClient(cfg: AiConfig) {
  const key = `${cfg.provider}:${cfg.region}`;
  if (!client || key !== clientKey) {
    // Credentials come from the environment: AWS credentials (Bedrock) or ANTHROPIC_API_KEY.
    client = cfg.provider === "bedrock" ? new AnthropicBedrockMantle({ awsRegion: cfg.region }) : new Anthropic();
    clientKey = key;
  }
  return client;
}

export type AiContext = {
  kind: AiKind;
  organizationId: string;
  vacancyId?: string | null;
  applicationId?: string | null;
  requestedBy: string;
  /** Short references (ids, counts) that say what the input was, without copying personal data. */
  inputRef: Record<string, unknown>;
};

export type AiResult<T> = { ok: true; id: string; output: T } | { ok: false; error: "disabled" | "refused" | "failed"; id?: string };

export async function runStructured<S extends z.ZodType>(
  ctx: AiContext,
  schema: S,
  content: Anthropic.ContentBlockParam[],
  opts: { effort?: "low" | "medium" | "high"; maxTokens?: number } = {},
): Promise<AiResult<z.infer<S>>> {
  const cfg = aiConfig();
  if (!cfg) return { ok: false, error: "disabled" };
  const prompt = PROMPTS[ctx.kind];
  const inputHash = createHash("sha256").update(JSON.stringify({ system: prompt.system, content })).digest("hex");
  const admin = createAdminClient();
  const log = (fields: { output: Json; status?: string; error?: string | null; latency?: number }) =>
    admin
      .from("ai_recommendations")
      .insert({
        kind: ctx.kind,
        organization_id: ctx.organizationId,
        vacancy_id: ctx.vacancyId ?? null,
        application_id: ctx.applicationId ?? null,
        requested_by: ctx.requestedBy,
        model: modelLabel(cfg),
        prompt_version: prompt.version,
        input_hash: inputHash,
        input_ref: ctx.inputRef as Json,
        output: fields.output,
        status: fields.status ?? "suggested",
        error: fields.error ?? null,
        latency_ms: fields.latency ?? null,
      })
      .select("id")
      .single();

  const started = Date.now();
  try {
    const response = await getClient(cfg).messages.parse({
      model: modelId(cfg),
      max_tokens: opts.maxTokens ?? 16000,
      system: prompt.system,
      output_config: { effort: opts.effort ?? "medium", format: zodOutputFormat(schema) },
      messages: [{ role: "user", content }],
    });
    const latency = Date.now() - started;
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      const reason = response.stop_reason === "refusal" ? "refusal" : `no output (${response.stop_reason})`;
      const { data } = await log({ output: {}, status: "failed", error: reason, latency });
      return { ok: false, error: response.stop_reason === "refusal" ? "refused" : "failed", id: data?.id };
    }
    const output = response.parsed_output as z.infer<S>;
    const { data, error } = await log({ output: output as Json, latency });
    if (error || !data) {
      // Without a log entry the suggestion must not be shown.
      console.error("ai log failed", error?.message);
      return { ok: false, error: "failed" };
    }
    return { ok: true, id: data.id, output };
  } catch (e) {
    const message = e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : e instanceof Error ? e.message : "unknown";
    console.error("ai call failed", ctx.kind, message);
    await log({ output: {}, status: "failed", error: message.slice(0, 500), latency: Date.now() - started });
    return { ok: false, error: "failed" };
  }
}

/** Records the person's decision on a suggestion (once; the database refuses a second decision). */
export async function decideRecommendation(id: string, status: "accepted" | "modified" | "rejected", finalOutput: unknown, decidedBy: string) {
  const { error } = await createAdminClient()
    .from("ai_recommendations")
    .update({ status, final_output: finalOutput as Json, decided_by: decidedBy })
    .eq("id", id)
    .eq("status", "suggested");
  if (error) console.error("ai decision failed", error.message);
  return !error;
}

/** Is AI assistance available for this customer (global switch + customer switches)? */
export async function aiAllowed(organizationId: string, what: "assist" | "scoring"): Promise<boolean> {
  if (!aiConfig()) return false;
  const { data } = await createAdminClient().from("organizations").select("ai_assist, ai_scoring").eq("id", organizationId).single();
  return what === "assist" ? Boolean(data?.ai_assist) : Boolean(data?.ai_assist && data?.ai_scoring);
}
