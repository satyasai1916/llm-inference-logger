import { NextResponse } from "next/server";
import { getAvailableProviders } from "@/lib/llm/providers/config";

export async function GET() {
  return NextResponse.json(getAvailableProviders());
}
