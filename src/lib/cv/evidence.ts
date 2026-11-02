/**
 * Guards that keep extracted skills honest:
 *  1. Remove lines that look like instructions aimed at an AI (prompt injection) before analysis.
 *  2. After analysis, keep a skill only if its evidence quote really appears in the CV text.
 */

const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all |any )?(the )?(previous|prior|above|earlier) (instructions|prompts?|rules)/i,
  /disregard (all |any )?(the )?(previous|prior|above) /i,
  /\b(system|developer) prompt\b/i,
  /\byou are (now )?(an? )?(ai|assistant|language model|chatgpt|gemini)\b/i,
  /\b(add|include|insert|list) (the )?(following )?skills?\s*:/i,
  /\bmark (me|this candidate) as\b/i,
  /\bnew instructions?\b/i,
];

export function sanitizeCvText(text: string): { text: string; removedLines: string[] } {
  const removedLines: string[] = [];
  const kept = text.split("\n").filter((line) => {
    const suspicious = INJECTION_PATTERNS.some((p) => p.test(line));
    if (suspicious) removedLines.push(line.trim().slice(0, 160));
    return !suspicious;
  });
  return { text: kept.join("\n"), removedLines };
}

/** Lowercase, unify quotes/dashes, strip punctuation, collapse whitespace. */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // diacritics (ā → a)
    .replace(/[‘’‚‛"“”„«»`´]/g, "'")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[^\p{L}\p{N}+#.\-' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const tokenize = (s: string) => normalizeForMatch(s).split(" ").filter((t) => t.length > 1);

export type EvidenceCheck = { ok: true } | { ok: false; reason: string };

/**
 * Evidence is accepted when it appears verbatim in the CV (after normalization), or when
 * at least 85% of its words appear in the CV within a single nearby window (tolerates the
 * model fixing line breaks / bullet characters, but not inventing content).
 */
export function checkEvidence(evidence: string, normalizedCv: string, cvTokens: string[]): EvidenceCheck {
  const ev = normalizeForMatch(evidence);
  if (ev.length < 3) return { ok: false, reason: "No evidence quote provided." };
  if (normalizedCv.includes(ev)) return { ok: true };

  const evTokens = tokenize(evidence);
  if (evTokens.length < 3) return { ok: false, reason: "Evidence quote not found in the CV." };

  const windowSize = Math.ceil(evTokens.length * 1.6) + 2;
  const needed = Math.ceil(evTokens.length * 0.85);
  for (let start = 0; start < cvTokens.length; start++) {
    const window = new Set(cvTokens.slice(start, start + windowSize));
    let hits = 0;
    for (const t of evTokens) if (window.has(t)) hits++;
    if (hits >= needed) return { ok: true };
  }
  return { ok: false, reason: "Evidence quote not found in the CV." };
}

export function buildCvIndex(cvText: string) {
  return { normalized: normalizeForMatch(cvText), tokens: tokenize(cvText) };
}
