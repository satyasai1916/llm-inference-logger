import type { BaseLLMProvider, LLMChunk, LLMRequest, LLMResponse } from "../types";
import { assertProviderConfigured } from "./config";

const GROK_BASE = "https://api.x.ai/v1";

function parseGrokError(status: number, body: string): string {
  try {
    const json = JSON.parse(body);
    if (status === 403 && json.code === "permission-denied") {
      return `${json.error} Activate free credits at https://console.x.ai (new accounts get promotional API credits).`;
    }
    return json.error ?? body;
  } catch {
    return body;
  }
}

export class GrokProvider implements BaseLLMProvider {
  readonly providerName = "grok";
  private apiKey: string;

  constructor() {
    assertProviderConfigured("grok");
    this.apiKey = process.env.GROK_API_KEY ?? "";
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
      const res = await fetch(`${GROK_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          max_tokens: request.maxTokens ?? 4096,
        }),
      });
      if (!res.ok) throw new Error(`Grok API ${res.status}: ${parseGrokError(res.status, await res.text())}`);
      const data = await res.json();
      content = data.choices?.[0]?.message?.content ?? "";
      inputTokens = data.usage?.prompt_tokens ?? 0;
      outputTokens = data.usage?.completion_tokens ?? 0;
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
    const res = await fetch(`${GROK_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.maxTokens ?? 4096,
        stream: true,
      }),
    });

    if (!res.ok) throw new Error(`Grok API ${res.status}: ${parseGrokError(res.status, await res.text())}`);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    let streamDone = false;
    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") { streamDone = true; break; }
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.delta?.content ?? "";
          if (text) yield { text, isFinal: false };
        } catch {
          // skip malformed SSE line
        }
      }
    }

    yield { text: "", isFinal: true, inputTokens: 0, outputTokens: 0 };
  }
}
