import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WINDOWS: Record<string, number> = { "1h": 1, "24h": 24, "7d": 168 };

export async function GET(req: NextRequest) {
  const window = req.nextUrl.searchParams.get("window") ?? "24h";
  const hours = WINDOWS[window] ?? 24;
  const since = new Date(Date.now() - hours * 3600 * 1000);

  type Row = { bucket: string; avg_ms: number | null; p95_ms: number | null; cnt: number | bigint };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      strftime('%Y-%m-%dT%H:00:00', started_at) as bucket,
      AVG(latency_ms) as avg_ms,
      MAX(latency_ms) as p95_ms,
      COUNT(*) as cnt
    FROM inference_logs
    WHERE started_at >= ${since}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  return NextResponse.json(
    rows.map((r) => ({
      bucket: r.bucket,
      avg_ms: Math.round(Number(r.avg_ms ?? 0) * 100) / 100,
      p95_ms: Math.round(Number(r.p95_ms ?? 0) * 100) / 100,
      count: Number(r.cnt),
    })),
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
  );
}
