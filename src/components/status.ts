/** Two inks for a status: cyan for success, magenta for anything 400 and up. */
export type StatusTone = "ok" | "bad";

export function statusTone(code: number): StatusTone {
  return code >= 400 || code === 0 ? "bad" : "ok";
}

export const REASONS: Record<number, string> = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  301: "Moved Permanently",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Content",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

/** "12s ago", "4m ago", "3h ago", against a clock passed in so server and browser agree. */
export function relativeTime(iso: string | Date, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Milliseconds as a reader wants them: "38 ms" under a second, "1.24 s" above. */
export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toLocaleString("en-US")} ms`;
}

/** The path a test call uses: each :param filled in, a trailing * given two segments. */
export function testPathFor(path: string): string {
  return path.replace(/:(\w+)/g, "test-$1").replace(/\/\*$/, "/a/b");
}

export function jsonError(text: string): string | null {
  try {
    JSON.parse(text);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message.replace(/^JSON\.parse: /, "") : "Invalid JSON";
  }
}
