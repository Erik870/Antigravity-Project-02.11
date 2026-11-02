import "server-only";
import {
  CvFileError,
  MAX_TEXT_CHARS,
  MIN_TEXT_CHARS,
  cleanExtractedText,
  detectCvFileKind,
} from "./validate";

/** Extract plain text from an uploaded CV. Runs on the server only; file contents are never executed. */
export async function extractCvText(
  fileName: string,
  bytes: Uint8Array,
): Promise<{ text: string; truncated: boolean }> {
  const kind = detectCvFileKind(fileName, bytes);
  let raw = "";

  try {
    if (kind === "pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await extractText(pdf, { mergePages: true });
      raw = Array.isArray(text) ? text.join("\n") : text;
    } else if (kind === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      raw = result.value;
    } else {
      raw = new TextDecoder("utf-8").decode(bytes);
    }
  } catch {
    throw new CvFileError("We could not read this file. It may be damaged or password-protected.", 422);
  }

  const text = cleanExtractedText(raw);
  if (text.length < MIN_TEXT_CHARS) {
    throw new CvFileError(
      kind === "pdf"
        ? "We found almost no text in this PDF. It is probably a scanned image — please upload a text-based PDF or DOCX."
        : "This CV contains too little text to analyse.",
      422,
    );
  }

  return text.length > MAX_TEXT_CHARS
    ? { text: text.slice(0, MAX_TEXT_CHARS), truncated: true }
    : { text, truncated: false };
}
