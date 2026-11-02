import { NextResponse } from "next/server";
import { pingGemini } from "@/lib/ai/analyze-cv";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await pingGemini();
  return NextResponse.json(status, { status: status.ok ? 200 : 500 });
}
