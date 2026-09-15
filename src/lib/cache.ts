/**
 * A tiny key/value cache over Upstash's REST API, with an in-process fallback.
 *
 * REST rather than a socket, because serverless functions cannot hold a
 * connection open between invocations. When the Upstash variables are unset the
 * fallback keeps everything working locally; on serverless it degrades to a
 * per-instance cache, which is still a real hit-rate improvement and never
 * returns stale data past its TTL.
 */
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
export const usingRedis = Boolean(url && token);

const memory = new Map<string, { value: string; expires: number }>();

async function command(...args: (string | number)[]): Promise<unknown> {
  const res = await fetch(`${url}/${args.map((a) => encodeURIComponent(String(a))).join("/")}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const body = (await res.json()) as { result: unknown };
  return body.result;
}

export async function cacheGet(key: string): Promise<string | null> {
  if (!usingRedis) {
    const hit = memory.get(key);
    if (!hit) return null;
    if (hit.expires < Date.now()) {
      memory.delete(key);
      return null;
    }
    return hit.value;
  }
  try {
    const result = await command("get", key);
    return typeof result === "string" ? result : null;
  } catch {
    return null; // a cache miss is always safe; never fail a request on this
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!usingRedis) {
    memory.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    return;
  }
  try {
    await command("set", key, value, "EX", ttlSeconds);
  } catch {
    /* ignore */
  }
}

export async function cacheDelete(key: string): Promise<void> {
  if (!usingRedis) {
    memory.delete(key);
    return;
  }
  try {
    await command("del", key);
  } catch {
    /* ignore */
  }
}

/** Fixed-window counter. Returns the count after incrementing. */
export async function rateLimitHit(key: string, windowSeconds: number): Promise<number> {
  if (!usingRedis) {
    const now = Date.now();
    const hit = memory.get(key);
    if (!hit || hit.expires < now) {
      memory.set(key, { value: "1", expires: now + windowSeconds * 1000 });
      return 1;
    }
    const next = Number(hit.value) + 1;
    hit.value = String(next);
    return next;
  }
  try {
    const count = Number(await command("incr", key));
    if (count === 1) await command("expire", key, windowSeconds);
    return count;
  } catch {
    return 0; // never lock users out because the limiter itself is down
  }
}
