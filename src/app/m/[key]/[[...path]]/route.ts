import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/cache";
import { didYouMean, matchRoute, Route } from "@/lib/match";
import { Segment } from "@/lib/path";
import { substitute } from "@/lib/template";
import { applyCollectionQuery } from "@/lib/collection";
import { queryObject, safeHeaders, sleep } from "@/lib/http";

/**
 * ALL /m/:workspaceKey/*path
 *
 * One handler serves every mock in the system. Nothing here is cached by Next,
 * because two identical requests can legitimately differ: one may draw the
 * injected failure and the other may not.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LOG_LIMIT = 500;
const MAX_DELAY_MS = 8000; // Vercel's function timeout is the real ceiling

type Params = { params: { key: string; path?: string[] } };

async function handle(req: NextRequest, { params }: Params) {
  const started = Date.now();
  const url = new URL(req.url);
  const requestPath = "/" + (params.path ?? []).join("/");
  const query = queryObject(url);
  const method = req.method.toUpperCase();

  // 1. Resolve the workspace. Cached for 60s so a hot mock doesn't touch
  //    Postgres on every call.
  const workspace = await resolveWorkspace(params.key);
  if (!workspace) {
    return NextResponse.json(
      { error: "No workspace with that key", key: params.key },
      { status: 404 }
    );
  }

  // 2. Rate limiting already happened in middleware.ts, keyed on the workspace
  //    key straight out of the URL — before this function did any work.
  const body = await readBody(req);

  // 3. Candidates come back already ordered by the index, so the matcher does
  //    no sorting of its own.
  const candidates = await prisma.endpoint.findMany({
    where: { workspaceId: workspace.id, method, isActive: true },
    orderBy: { specificity: "desc" },
    select: {
      id: true,
      path: true,
      segments: true,
      specificity: true,
      responseBody: true,
      statusCode: true,
      headers: true,
      delayMs: true,
      failureRate: true,
      failureStatus: true,
      failureBody: true,
    },
  });

  const routes: Route[] = candidates.map((e) => ({
    id: e.id,
    path: e.path,
    segments: e.segments as unknown as Segment[],
    specificity: e.specificity,
  }));

  const hit = matchRoute(routes, requestPath);

  // 4. Nothing matched. Return something the developer can act on.
  if (!hit) {
    const available = await prisma.endpoint.findMany({
      where: { workspaceId: workspace.id, isActive: true },
      orderBy: [{ path: "asc" }, { method: "asc" }],
      select: { method: true, path: true },
    });
    const suggestion = didYouMean(
      requestPath,
      available.map((e) => e.path)
    );
    const payload: Record<string, unknown> = {
      error: "No endpoint matched",
      requested: `${method} ${requestPath}`,
      available: available.map((e) => `${e.method} ${e.path}`),
    };
    if (suggestion && suggestion !== requestPath) {
      payload.didYouMean = suggestion;
      payload.hint = `You called ${requestPath}. Did you mean ${suggestion}?`;
    }
    await writeLog({
      workspaceId: workspace.id,
      endpointId: null,
      method,
      path: requestPath,
      query,
      headers: safeHeaders(req.headers),
      body,
      statusCode: 404,
      durationMs: Date.now() - started,
      matched: false,
      note: suggestion ? `did you mean ${suggestion}?` : "no endpoint matched",
    });
    return NextResponse.json(payload, { status: 404 });
  }

  const endpoint = candidates.find((e) => e.id === hit.route.id)!;

  // 5. Roll for failure before spending the delay, so a failing endpoint still
  //    answers fast — that is what a real server does.
  const failed = endpoint.failureRate > 0 && Math.random() * 100 < endpoint.failureRate;

  const delay = Math.min(Math.max(endpoint.delayMs, 0), MAX_DELAY_MS);
  if (!failed && delay > 0) await sleep(delay);

  const ctx = { params: hit.params, query, wildcard: hit.wildcard, now: new Date() };

  let status: number;
  let payload: unknown;
  if (failed) {
    status = endpoint.failureStatus;
    payload =
      endpoint.failureBody ?? {
        error: "Injected failure",
        rate: endpoint.failureRate,
        note: "This endpoint is configured to fail a percentage of requests.",
      };
  } else {
    status = endpoint.statusCode;
    payload = applyCollectionQuery(substitute(endpoint.responseBody, ctx), query);
  }

  const headers = new Headers({ "content-type": "application/json" });
  for (const [k, v] of Object.entries((endpoint.headers ?? {}) as Record<string, string>)) {
    headers.set(k, String(v));
  }
  headers.set("x-mockbird-endpoint", `${method} ${endpoint.path}`);
  headers.set("x-mockbird-specificity", String(endpoint.specificity));
  if (failed) headers.set("x-mockbird-failure", "injected");

  const durationMs = Date.now() - started;

  // 6. Bookkeeping. Both writes are fire-and-forget relative to the response
  //    body, but still inside the request — no worker, no queue, no cron.
  await Promise.all([
    prisma.endpoint.update({
      where: { id: endpoint.id },
      data: { hitCount: { increment: 1 } },
    }),
    writeLog({
      workspaceId: workspace.id,
      endpointId: endpoint.id,
      method,
      path: requestPath + (url.search || ""),
      query,
      headers: safeHeaders(req.headers),
      body,
      statusCode: status,
      durationMs,
      matched: true,
      note: failed ? "injected failure" : null,
    }),
  ]);

  return NextResponse.json(payload, { status, headers });
}

async function resolveWorkspace(key: string): Promise<{ id: string } | null> {
  const cacheKey = `ws:${key}`;
  const cached = await cacheGet(cacheKey);
  if (cached === "missing") return null;
  if (cached) return { id: cached };

  const workspace = await prisma.workspace.findUnique({
    where: { key },
    select: { id: true, expiresAt: true },
  });
  if (!workspace || (workspace.expiresAt && workspace.expiresAt < new Date())) {
    await cacheSet(cacheKey, "missing", 30);
    return null;
  }
  await cacheSet(cacheKey, workspace.id, 60);
  return { id: workspace.id };
}

async function readBody(req: NextRequest): Promise<unknown> {
  if (req.method === "GET" || req.method === "HEAD") return null;
  try {
    const text = await req.text();
    if (!text) return null;
    if (text.length > 100_000) return { truncated: true, bytes: text.length };
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text.slice(0, 2000) };
    }
  } catch {
    return null;
  }
}

/**
 * Writes the log row and trims the workspace back to its most recent 500.
 * The trim runs inside the request that created the overflow, which is why
 * this project needs no cron job.
 */
async function writeLog(data: {
  workspaceId: string;
  endpointId: string | null;
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
  statusCode: number;
  durationMs: number;
  matched: boolean;
  note: string | null;
}) {
  try {
    await prisma.requestLog.create({
      data: {
        workspaceId: data.workspaceId,
        endpointId: data.endpointId,
        method: data.method,
        path: data.path,
        query: data.query,
        headers: data.headers,
        body: data.body === null ? undefined : (data.body as object),
        statusCode: data.statusCode,
        durationMs: data.durationMs,
        matched: data.matched,
        note: data.note,
      },
    });

    // Trim probabilistically — one call in twenty — so the cost is amortised
    // instead of being paid on every request.
    if (Math.random() < 0.05) {
      const cutoff = await prisma.requestLog.findMany({
        where: { workspaceId: data.workspaceId },
        orderBy: { createdAt: "desc" },
        skip: LOG_LIMIT,
        take: 1,
        select: { createdAt: true },
      });
      if (cutoff.length > 0) {
        await prisma.requestLog.deleteMany({
          where: { workspaceId: data.workspaceId, createdAt: { lte: cutoff[0].createdAt } },
        });
      }
    }
  } catch {
    // Logging must never break the mock itself.
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
