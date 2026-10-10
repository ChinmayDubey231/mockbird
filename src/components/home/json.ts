/**
 * JSON for reading rather than parsing: a short object or array of plain
 * values stays on one line, anything bigger gets one entry per line.
 */
export function formatJson(value: unknown, indent = ""): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  const list = Array.isArray(value);
  const entries: [string | null, unknown][] = list
    ? (value as unknown[]).map((item) => [null, item])
    : Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return list ? "[]" : "{}";

  const inner = entries.map(
    ([key, item]) => (key === null ? "" : `${JSON.stringify(key)}: `) + formatJson(item, indent + "  ")
  );
  const flat = list ? `[${inner.join(", ")}]` : `{ ${inner.join(", ")} }`;
  const plain = entries.every(([, item]) => item === null || typeof item !== "object");
  if (plain && entries.length <= 3 && flat.length <= 40) return flat;

  const [open, close] = list ? ["[", "]"] : ["{", "}"];
  return `${open}\n${inner.map((line) => `${indent}  ${line}`).join(",\n")}\n${indent}${close}`;
}

export interface Run {
  text: string;
  marked: boolean;
}

/**
 * Splits a line into plain and marked runs. With two capture groups, group 1
 * is a prefix that stays plain and group 2 is the part that gets marked;
 * otherwise the whole match is marked.
 */
export function highlight(line: string, pattern: RegExp): Run[] {
  const runs: Run[] = [];
  let last = 0;
  for (const m of line.matchAll(new RegExp(pattern.source, "g"))) {
    const prefixed = m[2] !== undefined;
    const start = (m.index ?? 0) + (prefixed ? m[1]?.length ?? 0 : 0);
    const text = prefixed ? m[2] : m[0];
    if (start > last) runs.push({ text: line.slice(last, start), marked: false });
    runs.push({ text, marked: true });
    last = start + text.length;
  }
  if (last < line.length || runs.length === 0) runs.push({ text: line.slice(last), marked: false });
  return runs;
}

export type Kind = "key" | "string" | "number" | "literal" | "punct" | "plain";

export interface Token {
  text: string;
  kind: Kind;
}

const JSON_TOKEN = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|(")|([{}[\],])/g;

/**
 * Splits a fragment of formatted JSON into tokens for colouring. A fragment
 * can start or end mid-string, where a highlight has cut it, so a lone quote
 * is treated as part of a string rather than left plain.
 */
export function jsonTokens(text: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(JSON_TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) tokens.push({ text: text.slice(last, at), kind: "plain" });
    if (m[1] !== undefined) {
      tokens.push({ text: m[1], kind: m[2] !== undefined ? "key" : "string" });
      if (m[2] !== undefined) tokens.push({ text: m[2], kind: "punct" });
    } else if (m[3] !== undefined) tokens.push({ text: m[3], kind: "number" });
    else if (m[4] !== undefined) tokens.push({ text: m[4], kind: "literal" });
    else if (m[5] !== undefined) tokens.push({ text: m[5], kind: "string" });
    else tokens.push({ text: m[6], kind: "punct" });
    last = at + m[0].length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last), kind: "plain" });
  return tokens;
}

/**
 * A body as display lines, with a long array cut to its first two items and
 * a count of the rest. `total` overrides the count for a body that is itself
 * only an excerpt.
 */
export function previewLines(body: unknown, total?: number): { text: string; more: boolean }[] {
  const items = Array.isArray(body) ? body : null;
  const count = total ?? items?.length ?? 0;
  const shown = items && items.length > 2 ? items.slice(0, 2) : body;
  const lines = formatJson(shown)
    .split("\n")
    .map((text) => ({ text, more: false }));
  if (items && count > 2) {
    const more = { text: `  … ${count - 2} more`, more: true };
    if (lines.length > 1) lines.splice(lines.length - 1, 0, more);
    else lines.push(more);
  }
  return lines;
}
