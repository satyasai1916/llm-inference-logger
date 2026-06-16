export interface Conversation {
  id: string;
  title: string | null;
  provider: string;
  model: string;
  status: "active" | "cancelled" | "completed";
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  token_count: number | null;
  created_at: string;
}

export interface ConversationListResponse {
  items: Conversation[];
  total: number;
  page: number;
  page_size: number;
}

export interface MetricsSummary {
  total_requests: number;
  success_count: number;
  error_count: number;
  error_rate_pct: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  window: string;
}

export interface LatencyPoint {
  bucket: string;
  avg_ms: number;
  p95_ms: number;
  count: number;
}

export interface ProviderStat {
  provider: string;
  model: string;
  total: number;
  errors: number;
  error_rate_pct: number;
  avg_latency_ms: number;
  total_cost_usd: number;
}

export interface TokenPoint {
  bucket: string;
  input_tokens: number;
  output_tokens: number;
}

export const PROVIDERS: Record<string, { label: string; models: string[] }> = {
  gemini: {
    label: "Google Gemini",
    models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
  },
  grok: {
    label: "xAI Grok",
    models: ["grok-4.3"],
  },
  claude: {
    label: "Anthropic Claude (Bedrock)",
    models: [
      "claude-3-5-haiku-20241022",
      "claude-3-5-sonnet-20241022",
      "claude-3-7-sonnet-20250219",
    ],
  },
};
