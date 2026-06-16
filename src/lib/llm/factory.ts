import { LLMClient } from "./client";
import { assertProviderConfigured } from "./providers/config";
import { ClaudeProvider } from "./providers/claude";
import { GeminiProvider } from "./providers/gemini";
import { GrokProvider } from "./providers/grok";
import type { BaseLLMProvider } from "./types";

function makeProvider(providerName: string): BaseLLMProvider {
  assertProviderConfigured(providerName);
  switch (providerName) {
    case "claude": return new ClaudeProvider();
    case "gemini": return new GeminiProvider();
    case "grok":   return new GrokProvider();
    default: throw new Error(`Unknown provider: ${providerName}`);
  }
}

export function makeClient(providerName: string, baseUrl: string): LLMClient {
  return new LLMClient(makeProvider(providerName), baseUrl);
}
