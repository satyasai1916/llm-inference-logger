import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function serialize(c: { id: string; title: string | null; provider: string; model: string; status: string; createdAt: Date; updatedAt: Date }) {
  return { id: c.id, title: c.title, provider: c.provider, model: c.model, status: c.status, created_at: c.createdAt.toISOString(), updated_at: c.updatedAt.toISOString() };
}

function notFoundOrError(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serialize(conv));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const conv = await prisma.conversation.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });
    return NextResponse.json(serialize(conv));
  } catch (err) {
    return notFoundOrError(err);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.conversation.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return notFoundOrError(err);
  }
}
