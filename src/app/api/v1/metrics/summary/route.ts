import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WINDOWS: Record<string, number> = { "1h": 1, "24h": 24, "7d": 168 };

export async function GET(req: NextRequest) {
  const window = req.nextUrl.searchParams.get("window") ?? "24h";
  const hours = WINDOWS[window] ?? 24;
  const since = new Date(Date.now() - hours * 3600 * 1000);

  type Row = { total: number | bigint; success: number | bigint; errors: number | bigint; avg_lat: number | null; in_tok: number | bigint; out_tok: number | bigint; cost: number | null; p95: number | null };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
      AVG(latency_ms) as avg_lat,
      SUM(input_tokens) as in_tok,
      SUM(output_tokens) as out_tok,
      SUM(cost_usd) as cost,
      NULL as p95
    FROM inference_logs
    WHERE started_at >= ${since}
  `;

  const row = rows[0];
  const total = Number(row?.total ?? 0);
  const success = Number(row?.success ?? 0);
  const errors = Number(row?.errors ?? 0);
  const avgLat = Number(row?.avg_lat ?? 0);
  const cost = Number(row?.cost ?? 0);

  // SQLite p95 approximation
  const countForP95 = await prisma.inferenceLog.count({ where: { startedAt: { gte: since } } });
  let p95 = 0;
  if (countForP95 > 0) {
    const offset = Math.max(0, Math.floor(countForP95 * 0.95) - 1);
    const p95Row = await prisma.inferenceLog.findMany({
      where: { startedAt: { gte: since } },
      orderBy: { latencyMs: "asc" },
      skip: offset,
      take: 1,
      select: { latencyMs: true },
    });
    p95 = p95Row[0]?.latencyMs ?? 0;
  }

  return NextResponse.json({
    total_requests: total,
    success_count: success,
    error_count: errors,
    error_rate_pct: total ? Math.round((errors / total) * 10000) / 100 : 0,
    avg_latency_ms: Math.round(avgLat * 100) / 100,
    p95_latency_ms: Math.round(p95 * 100) / 100,
    total_input_tokens: Number(row?.in_tok ?? 0),
    total_output_tokens: Number(row?.out_tok ?? 0),
    total_cost_usd: Math.round(cost * 1_000_000) / 1_000_000,
    window,
  }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
