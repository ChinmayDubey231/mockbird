import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { workspaceKey } from "@/lib/ids";
import { generate } from "@/lib/ai";
import { compilePath } from "@/lib/path";
import { rateLimitHit } from "@/lib/cache";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

const STOPWORDS = new Set([
  "list", "collection", "set", "array", "single", "few", "couple", "some", "group", "bunch", "item", "items",
]);

/** Naive English pluralisation — good enough for a URL segment, not a dictionary. */
function pluralize(noun: string): string {
  if (noun.endsWith("s")) return noun;
  if (/[^aeiou]y$/.test(noun)) return noun.slice(0, -1) + "ies";
  if (/(s|x|z|ch|sh)$/.test(noun)) return noun + "es";
  return noun + "s";
}

/**
 * Pulls a plausible resource name out of a free-text description, so the demo
 * endpoint lands at e.g. /pets for "a list of pets..." instead of always at
 * /orders regardless of what was typed. Falls back to "orders" — the
 * long-standing default — whenever nothing usable is found, so behaviour for
 * odd input never gets worse than it already was.
 */
function guessPath(description: string): string {
  const text = description.toLowerCase();
  const patterns = [
    /\b(?:list|collection|set|array)\s+of\s+(?:[a-z]+\s+){0,3}?([a-z]+)/,
    /\b(?:a|an|the)\s+(?:[a-z]+\s+){0,3}?([a-z]+)\s+(?:with|containing|having|that has)\b/,
    // A leading quantity with no article, e.g. "twelve orders, one refunded"
    // or "three products, prices in EUR" — both real preset phrases on the
    // landing page's demo card.
    /^(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|several|many|multiple)\s+([a-z]+)/,
    /\b(?:a|an|the)\s+([a-z]+)\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = match?.[1];
    if (candidate && candidate.length >= 3 && !STOPWORDS.has(candidate)) {
      return `/${pluralize(candidate)}`;
    }
  }
  return "/orders";
}

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
