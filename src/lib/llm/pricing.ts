const PRICES: Record<string, [number, number]> = {
  "gemini-2.0-flash":           [0.0,    0.0],
  "gemini-1.5-flash":           [0.075,  0.30],
  "gemini-1.5-pro":             [1.25,   5.00],
  "gemini-1.0-pro":             [0.50,   1.50],
  "grok-4.3":                   [1.25,   2.50],
  "claude-3-5-haiku-20241022":  [0.80,   4.00],
  "claude-3-5-sonnet-20241022": [3.00,  15.00],
  "claude-3-7-sonnet-20250219": [3.00,  15.00],
  "claude-3-opus-20240229":     [15.00, 75.00],
};

const PER_TOKEN = 1_000_000;

export function computeCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICES[model];
  if (!price) return 0;
  const [inPrice, outPrice] = price;
  return (inputTokens * inPrice + outputTokens * outPrice) / PER_TOKEN;
}
