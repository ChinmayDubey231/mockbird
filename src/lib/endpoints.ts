import { compilePath, InvalidPathError } from "./path";

export const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type Method = (typeof METHODS)[number];

export const MAX_DELAY_MS = 8000;
export const MAX_BODY_BYTES = 256 * 1024;

export class ValidationError extends Error {}

export interface EndpointInput {
  method: string;
  path: string;
  responseBody: unknown;
  description?: string | null;
  schema?: unknown;
  statusCode?: number;
  headers?: Record<string, string>;
  delayMs?: number;
  failureRate?: number;
  failureStatus?: number;
  failureBody?: unknown;
  isActive?: boolean;
}

/** Normalises and range-checks everything before it reaches the database. */
export function validateEndpoint(input: EndpointInput) {
  const method = String(input.method ?? "").toUpperCase() as Method;
  if (!METHODS.includes(method)) {
    throw new ValidationError(`Method must be one of ${METHODS.join(", ")}`);
  }

  let compiled;
  try {
    compiled = compilePath(String(input.path ?? ""));
  } catch (err) {
    throw new ValidationError(err instanceof InvalidPathError ? err.message : "Invalid path");
  }

  if (input.responseBody === undefined) throw new ValidationError("Response body is required");
  const size = JSON.stringify(input.responseBody ?? null).length;
  if (size > MAX_BODY_BYTES) {
    throw new ValidationError(`Response body is ${Math.round(size / 1024)}KB — the limit is 256KB`);
  }

  return {
    method,
    path: compiled.path,
    segments: compiled.segments as unknown as object,
    specificity: compiled.specificity,
    description: input.description?.slice(0, 500) ?? null,
    schema: (input.schema ?? undefined) as object | undefined,
    responseBody: input.responseBody as object,
    statusCode: clamp(input.statusCode ?? 200, 100, 599),
    headers: sanitiseHeaders(input.headers),
    delayMs: clamp(input.delayMs ?? 0, 0, MAX_DELAY_MS),
    failureRate: clamp(input.failureRate ?? 0, 0, 100),
    failureStatus: clamp(input.failureStatus ?? 500, 100, 599),
    failureBody: (input.failureBody ?? undefined) as object | undefined,
    isActive: input.isActive ?? true,
  };
}

function clamp(value: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(Math.round(n), min), max);
}

/** Response headers a mock is not allowed to set. */
const FORBIDDEN = new Set(["content-length", "transfer-encoding", "connection", "host"]);

export function sanitiseHeaders(headers?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers ?? {})) {
    const key = k.trim().toLowerCase();
    if (!key || FORBIDDEN.has(key)) continue;
    out[key] = String(v).slice(0, 1000);
  }
  return out;
}
