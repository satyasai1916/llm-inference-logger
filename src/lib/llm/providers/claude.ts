import Anthropic from "@anthropic-ai/sdk";
import type { BaseLLMProvider, LLMChunk, LLMRequest, LLMResponse } from "../types";
import { assertProviderConfigured, isClaudeConfigured } from "./config";

export class ClaudeProvider implements BaseLLMProvider {
  readonly providerName = "claude";
  private client: Anthropic;

  constructor() {
    assertProviderConfigured("claude");
    const mode = process.env.CLAUDE_MODE ?? "sdk";
    if (mode === "bedrock") {
      const bedrockBaseUrl = process.env.BEDROCK_BASE_URL;
      const bedrockBearerToken = process.env.BEDROCK_BEARER_TOKEN;
      if (bedrockBaseUrl && bedrockBearerToken) {
        this.client = new Anthropic({
          baseURL: bedrockBaseUrl,
          authToken: bedrockBearerToken,
        });
      } else {
        this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      }
    } else {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  static isAvailable(): boolean {
    return isClaudeConfigured();
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const startedAt = new Date();
    const t0 = performance.now();
    let status: "success" | "error" = "success";
    let errorMessage: string | null = null;
    let content = "";
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const response = await this.client.messages.create({
        model: request.model,
        max_tokens: request.maxTokens ?? 4096,
        messages: request.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      });
      content = response.content[0]?.type === "text" ? response.content[0].text : "";
      inputTokens = response.usage.input_tokens;
      outputTokens = response.usage.output_tokens;
    } catch (err) {
      status = "error";
      errorMessage = err instanceof Error ? err.message : String(err);
      throw err;
    }

    return {
      content,
      model: request.model,
      provider: this.providerName,
      inputTokens,
      outputTokens,
      latencyMs: performance.now() - t0,
      timeToFirstTokenMs: null,
      startedAt,
      finishedAt: new Date(),
      status,
      errorMessage,
      sessionId: request.sessionId ?? null,
    };
  }

  async *stream(request: LLMRequest): AsyncGenerator<LLMChunk> {
    let inputTokens = 0;
    let outputTokens = 0;

    const stream = this.client.messages.stream({
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      messages: request.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { text: event.delta.text, isFinal: false };
      }
    }

    const finalMsg = await stream.finalMessage();
    inputTokens = finalMsg.usage.input_tokens;
    outputTokens = finalMsg.usage.output_tokens;
    yield { text: "", isFinal: true, inputTokens, outputTokens };
  }
}
