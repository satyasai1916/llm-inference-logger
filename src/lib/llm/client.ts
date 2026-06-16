import type { BaseLLMProvider, LLMChunk, LLMRequest, LLMResponse } from "./types";
import { dispatch } from "./dispatcher";
import { makePreview } from "./pii";
import { computeCost } from "./pricing";

export class LLMClient {
  constructor(
    private readonly provider: BaseLLMProvider,
    private readonly baseUrl: string,
  ) {}

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const response = await this.provider.complete(request);
    this._dispatchLog(request, response);
    return response;
  }

  async *stream(request: LLMRequest): AsyncGenerator<LLMChunk> {
    const chunks: string[] = [];
    const t0 = performance.now();
    let ttftMs: number | null = null;
    const startedAt = new Date();
    let status: "success" | "error" = "success";
    let errorMessage: string | null = null;
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      for await (const chunk of this.provider.stream(request)) {
        if (chunks.length === 0 && chunk.text) {
          ttftMs = performance.now() - t0;
        }
        chunks.push(chunk.text);
        if (chunk.isFinal) {
          inputTokens = chunk.inputTokens ?? 0;
          outputTokens = chunk.outputTokens ?? 0;
        }
        yield chunk;
      }
    } catch (err) {
      status = "error";
      errorMessage = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const latencyMs = performance.now() - t0;
      const fullText = chunks.join("");
      const synthetic: LLMResponse = {
        content: fullText,
        model: request.model,
        provider: this.provider.providerName,
        inputTokens,
        outputTokens,
        latencyMs,
        timeToFirstTokenMs: ttftMs,
        startedAt,
        finishedAt: new Date(),
        status,
        errorMessage,
        sessionId: request.sessionId ?? null,
      };
      this._dispatchLog(request, synthetic);
    }
  }

  private _dispatchLog(request: LLMRequest, response: LLMResponse): void {
    const userInput = request.messages.at(-1)?.content ?? "";
    dispatch(
      {
        sessionId: response.sessionId,
        provider: response.provider,
        model: response.model,
        status: response.status,
        errorMessage: response.errorMessage,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        latencyMs: response.latencyMs,
        timeToFirstTokenMs: response.timeToFirstTokenMs,
        startedAt: response.startedAt.toISOString(),
        finishedAt: response.finishedAt.toISOString(),
        inputPreview: makePreview(userInput),
        outputPreview: makePreview(response.content),
        costUsd: computeCost(response.model, response.inputTokens, response.outputTokens),
      },
      this.baseUrl,
    );
  }
}
