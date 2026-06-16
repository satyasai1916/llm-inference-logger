export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model: string;
  maxTokens?: number;
  stream?: boolean;
  sessionId?: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  timeToFirstTokenMs: number | null;
  startedAt: Date;
  finishedAt: Date;
  status: "success" | "error";
  errorMessage: string | null;
  sessionId: string | null;
}

export interface LLMChunk {
  text: string;
  isFinal: boolean;
  inputTokens?: number;
  outputTokens?: number;
}

export interface BaseLLMProvider {
  readonly providerName: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): AsyncGenerator<LLMChunk>;
}
