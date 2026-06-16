import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = req.nextUrl;
  const format = searchParams.get("format") ?? "json";

  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" } });

  if (format === "txt") {
    const lines = messages.map((m) => `[${m.role.toUpperCase()}]\n${m.content}`).join("\n\n---\n\n");
    return new Response(lines, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="conversation-${id}.txt"`,
      },
    });
  }

  const data = { conversation: { id: conv.id, title: conv.title, provider: conv.provider, model: conv.model }, messages };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="conversation-${id}.json"`,
    },
  });
}
