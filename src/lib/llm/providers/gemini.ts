import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BaseLLMProvider, LLMChunk, LLMRequest, LLMResponse } from "../types";
import { assertProviderConfigured } from "./config";

export class GeminiProvider implements BaseLLMProvider {
  readonly providerName = "gemini";
  private client: GoogleGenerativeAI;

  constructor() {
    assertProviderConfigured("gemini");
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
  }

  private buildHistory(messages: LLMRequest["messages"]) {
    // All messages except the last one form the history
    return messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  }

  private lastUserMessage(messages: LLMRequest["messages"]): string {
    return messages.at(-1)?.content ?? "";
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
      const model = this.client.getGenerativeModel({ model: request.model });
      const chat = model.startChat({ history: this.buildHistory(request.messages) });
      const result = await chat.sendMessage(this.lastUserMessage(request.messages));
      const response = result.response;
      content = response.text();
      inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
      outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
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

    const model = this.client.getGenerativeModel({ model: request.model });
    const chat = model.startChat({ history: this.buildHistory(request.messages) });
    const result = await chat.sendMessageStream(this.lastUserMessage(request.messages));

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (chunk.usageMetadata) {
        inputTokens = chunk.usageMetadata.promptTokenCount ?? 0;
        outputTokens = chunk.usageMetadata.candidatesTokenCount ?? 0;
      }
      if (text) yield { text, isFinal: false };
    }

    // Get final usage from aggregated response
    const finalResponse = await result.response;
    if (finalResponse.usageMetadata) {
      inputTokens = finalResponse.usageMetadata.promptTokenCount ?? inputTokens;
      outputTokens = finalResponse.usageMetadata.candidatesTokenCount ?? outputTokens;
    }

    yield { text: "", isFinal: true, inputTokens, outputTokens };
  }
}
