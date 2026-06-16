import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WINDOWS: Record<string, number> = { "1h": 1, "24h": 24, "7d": 168 };

export async function GET(req: NextRequest) {
  const window = req.nextUrl.searchParams.get("window") ?? "24h";
  const hours = WINDOWS[window] ?? 24;
  const since = new Date(Date.now() - hours * 3600 * 1000);

  type Row = { bucket: string; in_tok: number | bigint; out_tok: number | bigint };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      strftime('%Y-%m-%dT%H:00:00', started_at) as bucket,
      SUM(input_tokens) as in_tok,
      SUM(output_tokens) as out_tok
    FROM inference_logs
    WHERE started_at >= ${since}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;

  return NextResponse.json(
    rows.map((r) => ({
      bucket: r.bucket,
      input_tokens: Number(r.in_tok ?? 0),
      output_tokens: Number(r.out_tok ?? 0),
    })),
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
  );
}
