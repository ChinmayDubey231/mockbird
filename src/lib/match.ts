import { Segment, splitRequestPath } from "./path";

/**
 * Route matching.
 *
 * Candidates arrive already filtered by (workspace, method, isActive) and
 * already ordered by specificity DESC from the database index, so this function
 * does no sorting: it walks the list and returns the first pattern that fits.
 * Match time is therefore linear in the number of candidates and independent of
 * how the patterns are written.
 */

export interface Route {
  id: string;
  path: string;
  segments: Segment[];
  specificity: number;
}

export interface MatchResult<R extends Route> {
  route: R;
  params: Record<string, string>;
  /** Everything captured by a trailing wildcard, e.g. "invoices/sep.pdf". */
  wildcard: string | null;
}

export function matchSegments(
  segments: Segment[],
  parts: string[]
): { params: Record<string, string>; wildcard: string | null } | null {
  const hasWildcard = segments.length > 0 && segments[segments.length - 1].type === "wildcard";

  if (hasWildcard) {
    // A wildcard needs at least one part to stand in for, so /files/* does not
    // match a bare /files. Everything before it must still line up exactly.
    if (parts.length < segments.length) return null;
  } else if (parts.length !== segments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type === "wildcard") {
      return { params, wildcard: parts.slice(i).join("/") };
    }
    const part = parts[i];
    if (seg.type === "static") {
      if (seg.value !== part) return null; // case-sensitive, deliberately
    } else {
      if (!part) return null; // a param never matches an empty segment
      params[seg.name] = part;
    }
  }

  return { params, wildcard: null };
}

export function matchRoute<R extends Route>(
  candidates: R[],
  requestPath: string
): MatchResult<R> | null {
  const parts = splitRequestPath(requestPath);
  for (const route of candidates) {
    const hit = matchSegments(route.segments, parts);
    if (hit) return { route, params: hit.params, wildcard: hit.wildcard };
  }
  return null;
}

/**
 * Damerau-style edit distance, capped early. Used only to turn a 404 into a
 * suggestion, so it never needs to be exact past a distance of 3.
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return 99;

  // Damerau-Levenshtein: transposition counts as one edit, because the typo
  // this is here to catch — /ordres for /orders — is a transposition.
  let twoBack: number[] = [];
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const row = new Array<number>(n + 1);
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        row[j] = Math.min(row[j], twoBack[j - 2] + 1);
      }
    }
    twoBack = prev;
    prev = row;
  }
  return prev[n];
}

export function didYouMean(requestPath: string, known: string[]): string | null {
  const target = requestPath.toLowerCase();
  let best: string | null = null;
  let bestScore = Infinity;
  for (const candidate of known) {
    const score = editDistance(target, candidate.toLowerCase());
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  // Two edits, or a quarter of the path for longer ones. Past that a
  // suggestion is noise rather than help.
  const tolerance = Math.max(2, Math.floor(target.length / 4));
  return best && bestScore <= tolerance ? best : null;
}
