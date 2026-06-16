import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeClient } from "@/lib/llm/factory";
import type { LLMMessage } from "@/lib/llm/types";

function serializeMsg(m: { id: string; conversationId: string; role: string; content: string; tokenCount: number | null; createdAt: Date }) {
  return { id: m.id, conversation_id: m.conversationId, role: m.role, content: m.content, token_count: m.tokenCount, created_at: m.createdAt.toISOString() };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages.map(serializeMsg));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { content } = body;

  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "content is required" }, { status: 422 });
  }

  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conv.status === "cancelled") return NextResponse.json({ error: "Conversation is cancelled" }, { status: 400 });

  try {
    // Parallelize user message save and title update
    await Promise.all([
      prisma.message.create({ data: { conversationId: id, role: "user", content } }),
      conv.title
        ? Promise.resolve()
        : prisma.conversation.update({ where: { id }, data: { title: content.slice(0, 80) } }),
    ]);

    const history = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" } });
    const messages: LLMMessage[] = history.map((m) => ({ role: m.role as LLMMessage["role"], content: m.content }));

    const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
    const client = makeClient(conv.provider, baseUrl);
    const response = await client.chat({ messages, model: conv.model, sessionId: id });

    const assistantMsg = await prisma.message.create({
      data: { conversationId: id, role: "assistant", content: response.content, tokenCount: response.outputTokens },
    });
    return NextResponse.json(serializeMsg(assistantMsg), { status: 201 });
  } catch (err) {
    console.error("[messages POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
