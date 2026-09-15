import { NextResponse } from "next/server";

export function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

export function fail(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** Headers that must never reach the request log. */
const SENSITIVE = new Set(["authorization", "cookie", "set-cookie", "proxy-authorization"]);

export function safeHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (SENSITIVE.has(k)) return;
    out[k] = value.length > 512 ? `${value.slice(0, 512)}…` : value;
  });
  return out;
}

export function queryObject(url: URL): Record<string, string> {
  const out: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
