import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  type Row = { provider: string; model: string; total: number | bigint; errors: number | bigint; avg_lat: number | null; cost: number | null };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      provider,
      model,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
      AVG(latency_ms) as avg_lat,
      SUM(cost_usd) as cost
    FROM inference_logs
    GROUP BY provider, model
    ORDER BY COUNT(*) DESC
  `;

  return NextResponse.json(
    rows.map((r) => {
      const total = Number(r.total);
      const errors = Number(r.errors);
      return {
        provider: r.provider,
        model: r.model,
        total,
        errors,
        error_rate_pct: total ? Math.round((errors / total) * 10000) / 100 : 0,
        avg_latency_ms: Math.round(Number(r.avg_lat ?? 0) * 100) / 100,
        total_cost_usd: Math.round(Number(r.cost ?? 0) * 1_000_000) / 1_000_000,
      };
    }),
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
  );
}
