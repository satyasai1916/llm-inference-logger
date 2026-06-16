const PATTERNS: [RegExp, string][] = [
  [/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g, "[EMAIL]"],
  [/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[PHONE]"],
  [
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g,
    "[CARD]",
  ],
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]"],
];

const PREVIEW_LENGTH = 500;

export function redact(text: string | null | undefined): string | null {
  if (text == null) return null;
  let result = text;
  for (const [pattern, label] of PATTERNS) {
    result = result.replace(pattern, label);
  }
  return result;
}

export function makePreview(text: string | null | undefined): string | null {
  if (text == null) return null;
  return redact(text.slice(0, PREVIEW_LENGTH));
}
