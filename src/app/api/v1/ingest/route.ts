import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();

  await prisma.inferenceLog.create({
    data: {
      sessionId: body.sessionId ?? null,
      provider: body.provider,
      model: body.model,
      status: body.status,
      errorMessage: body.errorMessage ?? null,
      inputTokens: body.inputTokens ?? 0,
      outputTokens: body.outputTokens ?? 0,
      totalTokens: (body.inputTokens ?? 0) + (body.outputTokens ?? 0),
      latencyMs: body.latencyMs ?? 0,
      timeToFirstTokenMs: body.timeToFirstTokenMs ?? null,
      startedAt: new Date(body.startedAt),
      finishedAt: new Date(body.finishedAt),
      inputPreview: body.inputPreview ?? null,
      outputPreview: body.outputPreview ?? null,
      costUsd: body.costUsd ?? 0,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
