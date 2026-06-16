import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isProviderConfigured } from "@/lib/llm/providers/config";

function serialize(c: { id: string; title: string | null; provider: string; model: string; status: string; createdAt: Date; updatedAt: Date }) {
  return { id: c.id, title: c.title, provider: c.provider, model: c.model, status: c.status, created_at: c.createdAt.toISOString(), updated_at: c.updatedAt.toISOString() };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") ?? "20")));
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.conversation.count(),
  ]);

  return NextResponse.json({ items: items.map(serialize), total, page, page_size: pageSize });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { provider, model, title } = body;
  if (!provider || !model) {
    return NextResponse.json({ error: "provider and model are required" }, { status: 422 });
  }
  if (!isProviderConfigured(provider)) {
    return NextResponse.json({ error: `Provider "${provider}" is not configured. Set the required API key in .env` }, { status: 400 });
  }
  const conv = await prisma.conversation.create({ data: { provider, model, title: title ?? null } });
  return NextResponse.json(serialize(conv), { status: 201 });
}
