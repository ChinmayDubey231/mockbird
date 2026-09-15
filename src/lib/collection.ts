/**
 * Collection filtering.
 *
 * When the stored body is an array, query parameters are applied server-side so
 * one mock behaves like a real paginated list endpoint. Anything that is not an
 * array is returned untouched — the query string is still logged.
 */

const RESERVED = new Set(["limit", "offset", "page", "sort", "order"]);

export interface CollectionOptions {
  /** Hard ceiling so a single call can't be asked to serialise 100k rows. */
  maxLimit?: number;
}

export function applyCollectionQuery(
  body: unknown,
  query: Record<string, string>,
  options: CollectionOptions = {}
): unknown {
  if (!Array.isArray(body)) return body;
  const maxLimit = options.maxLimit ?? 1000;
  let rows = body as unknown[];

  // ?field=value — exact match, compared as strings so ?total=4820 works.
  for (const [key, value] of Object.entries(query)) {
    if (RESERVED.has(key)) continue;
    rows = rows.filter((row) => {
      if (!row || typeof row !== "object") return false;
      const actual = (row as Record<string, unknown>)[key];
      return actual !== undefined && String(actual) === value;
    });
  }

  if (query.sort) {
    const key = query.sort;
    const dir = query.order === "desc" ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const av = field(a, key);
      const bv = field(b, key);
      if (av === bv) return 0;
      if (av === undefined) return 1; // missing values sort last, either way
      if (bv === undefined) return -1;
      return (av < bv ? -1 : 1) * dir;
    });
  }

  const limit = toInt(query.limit);
  const page = toInt(query.page);
  let offset = toInt(query.offset) ?? 0;
  if (offset < 0) offset = 0;
  if (page !== null && page > 1 && limit !== null) offset = (page - 1) * limit;

  if (offset > 0) rows = rows.slice(offset);
  if (limit !== null) rows = rows.slice(0, Math.min(limit, maxLimit));

  return rows;
}

/** Reads one property from a row, whatever shape the row happens to be. */
function field(row: unknown, key: string): string | number | undefined {
  if (!row || typeof row !== "object") return undefined;
  const value = (row as Record<string, unknown>)[key];
  if (typeof value === "string" || typeof value === "number") return value;
  return value === undefined || value === null ? undefined : String(value);
}

function toInt(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}
