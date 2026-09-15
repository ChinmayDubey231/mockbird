/**
 * Path compilation.
 *
 * A stored path is never matched as a string. At save time it is split into
 * segments and given a numeric specificity, both of which are persisted. The
 * request path is then compared segment by segment, and ordering is done by the
 * database index on (workspaceId, method, specificity) rather than in Node.
 */

export type Segment =
  | { type: "static"; value: string }
  | { type: "param"; name: string }
  | { type: "wildcard" };

export class InvalidPathError extends Error {}

const PARAM_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * "/orders/:id/items" -> [static orders, param id, static items]
 * A trailing "*" becomes a wildcard segment and matches any depth below it.
 */
export function parsePath(input: string): Segment[] {
  const raw = input.trim();
  if (!raw.startsWith("/")) throw new InvalidPathError("Path must start with /");
  if (raw.includes("?")) throw new InvalidPathError("Path must not contain a query string");

  const parts = raw.split("/").slice(1).filter((p) => p.length > 0);
  const segments: Segment[] = [];
  const seen = new Set<string>();

  parts.forEach((part, i) => {
    if (part === "*") {
      if (i !== parts.length - 1) {
        throw new InvalidPathError("A wildcard is only allowed as the last segment");
      }
      segments.push({ type: "wildcard" });
      return;
    }
    if (part.startsWith(":")) {
      const name = part.slice(1);
      if (!PARAM_NAME.test(name)) {
        throw new InvalidPathError(`":${name}" is not a valid parameter name`);
      }
      if (seen.has(name)) throw new InvalidPathError(`Duplicate parameter ":${name}"`);
      seen.add(name);
      segments.push({ type: "param", name });
      return;
    }
    segments.push({ type: "static", value: part });
  });

  return segments;
}

/**
 * specificity = static*100 - params*10 - (wildcard ? 50 : 0)
 *
 * Sorted descending this puts static-heavy patterns first, so /orders/new beats
 * /orders/:id (200 vs 190) and both beat /orders/* (100 - 50 = 50).
 */
export function specificity(segments: Segment[]): number {
  let statics = 0;
  let params = 0;
  let wildcard = false;
  for (const s of segments) {
    if (s.type === "static") statics++;
    else if (s.type === "param") params++;
    else wildcard = true;
  }
  return statics * 100 - params * 10 - (wildcard ? 50 : 0);
}

/** Canonical string form, so "/orders/" and "orders" both store as "/orders". */
export function formatPath(segments: Segment[]): string {
  if (segments.length === 0) return "/";
  return (
    "/" +
    segments
      .map((s) => (s.type === "static" ? s.value : s.type === "param" ? `:${s.name}` : "*"))
      .join("/")
  );
}

export function compilePath(input: string): {
  path: string;
  segments: Segment[];
  specificity: number;
} {
  const segments = parsePath(input);
  return { path: formatPath(segments), segments, specificity: specificity(segments) };
}

/** Splits an inbound request path into comparable parts. */
export function splitRequestPath(input: string): string[] {
  return input
    .split("/")
    .filter((p) => p.length > 0)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        // A segment with malformed percent-encoding is left as-is rather than
        // crashing the request — it just won't match anything, same as any
        // other unrecognised path.
        return p;
      }
    });
}
