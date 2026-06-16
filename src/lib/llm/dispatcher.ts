export interface IngestPayload {
  sessionId: string | null;
  provider: string;
  model: string;
  status: string;
  errorMessage: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  timeToFirstTokenMs: number | null;
  startedAt: string;
  finishedAt: string;
  inputPreview: string | null;
  outputPreview: string | null;
  costUsd: number;
}

export function dispatch(payload: IngestPayload, baseUrl: string): void {
  // fire-and-forget: do not await
  (async () => {
    try {
      await fetch(`${baseUrl}/api/v1/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[dispatcher] ingest failed:", err);
    }
  })();
}
