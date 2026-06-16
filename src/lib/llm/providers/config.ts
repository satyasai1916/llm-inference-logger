import { PROVIDERS } from "@/types";

export function isClaudeConfigured(): boolean {
  const mode = process.env.CLAUDE_MODE ?? "sdk";
  if (mode === "bedrock") {
    const bedrockBaseUrl = process.env.BEDROCK_BASE_URL;
    const bedrockBearerToken = process.env.BEDROCK_BEARER_TOKEN;
    if (bedrockBaseUrl && bedrockBearerToken) return true;
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function isProviderConfigured(provider: string): boolean {
  switch (provider) {
    case "gemini":
      return Boolean(process.env.GEMINI_API_KEY);
    case "grok":
      return Boolean(process.env.GROK_API_KEY);
    case "claude":
      return isClaudeConfigured();
    default:
      return false;
  }
}

export function getAvailableProviders(): Record<string, { label: string; models: string[] }> {
  return Object.fromEntries(
    Object.entries(PROVIDERS).filter(([name]) => isProviderConfigured(name))
  );
}

export function assertProviderConfigured(provider: string): void {
  if (!isProviderConfigured(provider)) {
    throw new Error(`Provider "${provider}" is not configured. Set the required API key in .env`);
  }
}
