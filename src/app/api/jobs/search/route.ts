import { NextRequest, NextResponse } from "next/server";
import { JobSearchRequest } from "@/lib/types";
import { searchJobs } from "@/lib/jobs/search";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = JobSearchRequest.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid search payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const results = await searchJobs(parsed.data);
    return NextResponse.json(results);
  } catch (err: any) {
    console.error("[api/jobs/search] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to search jobs." },
      { status: 500 }
    );
  }
}
