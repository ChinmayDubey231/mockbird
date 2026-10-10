import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { workspaceKey } from "@/lib/ids";
import { generate } from "@/lib/ai";
import { compilePath } from "@/lib/path";
import { guessPath } from "@/lib/guessPath";
import { rateLimitHit } from "@/lib/cache";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The landing page demo. Creates a real workspace that expires in 24 hours, so
 * the curl command a visitor copies actually works. No signup, and the
 * workspace is claimed permanently if they later create an account.
 */
export async function POST(req: NextRequest) {
  const { description, delayMs, failureRate } = (await req.json().catch(() => ({}))) as {
    description?: string;
    delayMs?: number;
    failureRate?: number;
  };
  const text = (description ?? "").trim();
  if (!text) return fail(422, "Describe the endpoint you want");

  const user = await requireUser();
  const used = await rateLimitHit(`demo:${user.id}`, 3600);
  if (used > 10) return fail(429, "That's ten demo endpoints this hour — sign in for more");

  // The delay/failure chips on the landing page are real controls, not a
  // cosmetic preview — they set the same fields the full endpoint editor
  // does, clamped to the same range /m serves against.
  const clampedDelay = Math.min(Math.max(Math.round(Number(delayMs) || 0), 0), 8000);
  const clampedFailureRate = Math.min(Math.max(Math.round(Number(failureRate) || 0), 0), 100);

  const path = guessPath(text);
  const generated = await generate({ description: text, method: "GET", path });
  // guessPath only ever emits a single lowercase-letter segment, so this
  // can't actually throw — the try/catch is only in case that guarantee
  // ever changes underneath it.
  const compiled = (() => {
    try {
      return compilePath(path);
    } catch {
      return compilePath("/orders");
    }
  })();

  const workspace = await prisma.workspace.create({
    data: {
      name: "Demo workspace",
      key: workspaceKey(),
      userId: user.id,
      expiresAt: new Date(Date.now() + DAY_MS),
    },
  });

  await prisma.endpoint.create({
    data: {
      workspaceId: workspace.id,
      method: "GET",
      path: compiled.path,
      segments: compiled.segments as unknown as object,
      specificity: compiled.specificity,
      description: text,
      schema: (generated.schema ?? undefined) as object | undefined,
      responseBody: generated.sample as object,
      delayMs: clampedDelay,
      failureRate: clampedFailureRate,
      // The landing page presents the failure chip as an outage, so the demo
      // fails the way one does rather than with the editor's generic 500.
      failureStatus: 503,
    },
  });

  return json({
    key: workspace.key,
    workspaceId: workspace.id,
    path: compiled.path,
    sample: generated.sample,
    source: generated.source,
    expiresInHours: 24,
  });
}
