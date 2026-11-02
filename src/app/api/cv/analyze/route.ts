import { NextRequest, NextResponse } from "next/server";
import { extractCvText } from "@/lib/cv/extract";
import { sanitizeCvText } from "@/lib/cv/evidence";
import { analyzeCv } from "@/lib/ai/analyze-cv";
import { CvFileError } from "@/lib/cv/validate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const fileName = file.name;
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // 1. Extract text server-side safely
    const { text: rawText, truncated } = await extractCvText(fileName, bytes);

    // 2. Sanitize against prompt injection
    const { text: cleanText, removedLines } = sanitizeCvText(rawText);

    // 3. AI Analysis with Gemini
    const { profile, droppedSkills } = await analyzeCv(cleanText);

    const warnings: string[] = [];
    if (truncated) {
      warnings.push("CV was very long; analysis was focused on the first 30,000 characters.");
    }
    if (removedLines.length > 0) {
      warnings.push(`Ignored ${removedLines.length} suspicious or non-standard instructions in the document.`);
    }

    return NextResponse.json({
      profile,
      droppedSkills,
      warnings,
      meta: {
        fileName,
        characters: cleanText.length,
        model: "gemini-3.5-flash-lite",
      },
    });
  } catch (err: any) {
    console.error("[api/cv/analyze] error:", err);
    if (err instanceof CvFileError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err?.message || "An unexpected error occurred during CV analysis." },
      { status: 500 }
    );
  }
}
