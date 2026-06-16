const BASE = "";

export async function streamChat(
  convId: string,
  content: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${BASE}/api/v1/conversations/${convId}/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // RAF-based chunk batcher: coalesces all tokens that arrive within one animation
  // frame into a single onChunk call, capping React re-renders at ~60/sec
  let pendingText = "";
  let rafScheduled = false;

  const flushChunks = () => {
    if (pendingText) {
      onChunk(pendingText);
      pendingText = "";
    }
    rafScheduled = false;
  };

  const enqueueChunk = (text: string) => {
    pendingText += text;
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(flushChunks);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        if (!event.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(event.slice(6));
          if (data.error) {
            // Flush any pending text before error
            if (pendingText) { onChunk(pendingText); pendingText = ""; }
            onError(data.error);
            return;
          }
          if (data.text) enqueueChunk(data.text);
          if (data.done) {
            // Flush remaining buffered text synchronously before calling onDone
            if (pendingText) { onChunk(pendingText); pendingText = ""; }
            onDone();
            return;
          }
        } catch {
          // malformed SSE event — skip
        }
      }
    }
  } finally {
    // Ensure any buffered text is flushed even if the loop exits unexpectedly
    if (pendingText) { onChunk(pendingText); pendingText = ""; }
  }

  onDone();
}
