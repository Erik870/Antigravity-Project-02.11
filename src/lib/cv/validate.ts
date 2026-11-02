export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MIN_TEXT_CHARS = 150;
export const MAX_TEXT_CHARS = 30_000;

export type CvFileKind = "pdf" | "docx" | "txt";

export class CvFileError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "CvFileError";
  }
}

/**
 * Determine file kind from extension AND magic bytes. Both must agree,
 * so a renamed executable or image is rejected.
 */
export function detectCvFileKind(fileName: string, bytes: Uint8Array): CvFileKind {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (bytes.byteLength === 0) throw new CvFileError("The file is empty.");
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new CvFileError("The file is larger than 5 MB.", 413);
  }

  const startsWith = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  const isPdf = startsWith([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
  const isZip = startsWith([0x50, 0x4b, 0x03, 0x04]); // PK.. (DOCX is a zip)

  if (ext === "pdf") {
    if (!isPdf) throw new CvFileError("This file has a .pdf name but is not a valid PDF.");
    return "pdf";
  }
  if (ext === "docx") {
    if (!isZip) throw new CvFileError("This file has a .docx name but is not a valid Word document.");
    return "docx";
  }
  if (ext === "txt") {
    if (isPdf || isZip || bytes.includes(0)) {
      throw new CvFileError("This .txt file does not contain plain text.");
    }
    return "txt";
  }
  if (ext === "doc") {
    throw new CvFileError("Old .doc files are not supported. Please save as .docx or PDF.");
  }
  throw new CvFileError("Unsupported file type. Please upload a PDF, DOCX or TXT file.");
}

/** Collapse whitespace produced by PDF/DOCX extraction. */
export function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v\u00a0]+/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
