import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeClient } from "@/lib/llm/factory";
import type { LLMMessage } from "@/lib/llm/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { content } = body;

  if (!content || typeof content !== "string") {
    return new Response(JSON.stringify({ error: "content is required" }), { status: 422 });
  }

  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (!conv) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  if (conv.status === "cancelled") return new Response(JSON.stringify({ error: "Conversation is cancelled" }), { status: 400 });

  // Parallelize: save user message + conditionally update title
  await Promise.all([
    prisma.message.create({ data: { conversationId: id, role: "user", content } }),
    conv.title
      ? Promise.resolve()
      : prisma.conversation.update({ where: { id }, data: { title: content.slice(0, 80) } }),
  ]);

  const history = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });
  const messages: LLMMessage[] = history.map((m) => ({ role: m.role as LLMMessage["role"], content: m.content }));

  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  const client = makeClient(conv.provider, baseUrl);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const collected: string[] = [];

      const enqueue = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      const heartbeat = () =>
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));

      // Send a heartbeat every 5 seconds to keep proxies alive
      const heartbeatInterval = setInterval(heartbeat, 5_000);

      try {
        for await (const chunk of client.stream({ messages, model: conv.model, sessionId: id, stream: true })) {
          // Stop if client disconnected
          if (req.signal?.aborted) break;

          if (chunk.isFinal) {
            enqueue({ text: "", done: true });
            break;
          }
          collected.push(chunk.text);
          enqueue({ text: chunk.text, done: false });
        }
      } catch (err) {
        enqueue({ error: err instanceof Error ? err.message : String(err), done: true });
      } finally {
        clearInterval(heartbeatInterval);
        const fullText = collected.join("");
        if (fullText) {
          try {
            await prisma.message.create({ data: { conversationId: id, role: "assistant", content: fullText } });
          } catch (err) {
            console.error("[stream] failed to persist assistant message:", err);
          }
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
