/**
 * Token substitution.
 *
 * A stored response body may contain tokens that are resolved against the
 * request at serve time. This is what makes GET /orders/:id return a body whose
 * "id" field matches whatever was actually asked for.
 *
 *   {{id}}           the matched path param of that name
 *   {{wildcard}}     everything captured by a trailing *
 *   {{query.page}}   a query-string value ("" when absent)
 *   {{now}}          ISO timestamp at request time
 *   {{index}}        zero-based position inside the enclosing array
 *   {{random.name}}  a fake name, different on every request
 *   {{random.int}}   an integer 1–9999
 *
 * Everything except the two random tokens is deterministic: the same request
 * returns the same bytes. The random tokens exist because people ask for them,
 * and the UI says plainly that they break that guarantee.
 */

export interface SubstitutionContext {
  params: Record<string, string>;
  query: Record<string, string>;
  wildcard?: string | null;
  now?: Date;
}

const TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

const FIRST_NAMES = [
  "Rohan", "Ananya", "Kabir", "Meera", "Arjun", "Ishita", "Vikram", "Priya",
  "Aditya", "Neha", "Farhan", "Divya", "Siddharth", "Tara", "Nikhil", "Sana",
];
const LAST_NAMES = [
  "Mehta", "Iyer", "Sharma", "Nair", "Kulkarni", "Bose", "Reddy", "Chawla",
  "Deshpande", "Menon", "Rao", "Bhat", "Sethi", "Pillai",
];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function resolve(
  token: string,
  ctx: SubstitutionContext,
  index: number | null
): string | number | null {
  if (Object.prototype.hasOwnProperty.call(ctx.params, token)) return ctx.params[token];
  if (token.startsWith("query.")) return ctx.query[token.slice(6)] ?? "";
  if (token === "wildcard") return ctx.wildcard ?? "";
  if (token === "now") return (ctx.now ?? new Date()).toISOString();
  if (token === "index") return index ?? 0;
  if (token === "random.name") return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  if (token === "random.int") return Math.floor(Math.random() * 9999) + 1;
  return null; // unknown token — left visible in the output on purpose
}

function substituteString(
  input: string,
  ctx: SubstitutionContext,
  index: number | null
): unknown {
  // A string that is nothing but one token takes that token's native type, so
  // "qty": "{{index}}" comes back as a number rather than "0".
  const exact = /^\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}$/.exec(input);
  if (exact) {
    const value = resolve(exact[1], ctx, index);
    return value === null ? input : value;
  }
  return input.replace(TOKEN, (whole, name: string) => {
    const value = resolve(name, ctx, index);
    return value === null ? whole : String(value);
  });
}

export function substitute(
  value: unknown,
  ctx: SubstitutionContext,
  index: number | null = null
): unknown {
  if (typeof value === "string") return substituteString(value, ctx, index);
  if (Array.isArray(value)) return value.map((item, i) => substitute(item, ctx, i));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = substitute(v, ctx, index);
    }
    return out;
  }
  return value;
}

/** Tokens present in a body, for the "tokens in use" hint in the editor. */
export function tokensUsed(value: unknown): string[] {
  const found = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      for (const m of v.matchAll(TOKEN)) found.add(m[1]);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(value);
  return [...found];
}
