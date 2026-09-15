import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { compilePath, InvalidPathError } from "@/lib/path";
import { MAX_DELAY_MS, MAX_BODY_BYTES, sanitiseHeaders } from "@/lib/endpoints";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

async function ownedEndpoint(id: string) {
  const user = await currentUser();
  if (!user) return null;
  const endpoint = await prisma.endpoint.findUnique({ where: { id }, include: { workspace: true } });
  if (!endpoint || endpoint.workspace.userId !== user.id) return null;
  return endpoint;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const existing = await ownedEndpoint(params.id);
  if (!existing) return fail(404, "Not found");

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (body.path !== undefined) {
    try {
      const compiled = compilePath(String(body.path));
      data.path = compiled.path;
      data.segments = compiled.segments;
      data.specificity = compiled.specificity;
    } catch (err) {
      return fail(422, err instanceof InvalidPathError ? err.message : "Invalid path");
    }
  }
  if (body.responseBody !== undefined) {
    const size = JSON.stringify(body.responseBody ?? null).length;
    if (size > MAX_BODY_BYTES) {
      return fail(422, `Response body is ${Math.round(size / 1024)}KB — the limit is 256KB`);
    }
    data.responseBody = body.responseBody;
  }
  if (body.failureBody !== undefined) {
    const size = JSON.stringify(body.failureBody ?? null).length;
    if (size > MAX_BODY_BYTES) {
      return fail(422, `Failure body is ${Math.round(size / 1024)}KB — the limit is 256KB`);
    }
    data.failureBody = body.failureBody;
  }
  if (body.headers !== undefined) {
    data.headers = sanitiseHeaders(body.headers as Record<string, string> | undefined);
  }
  if (body.statusCode !== undefined) data.statusCode = clamp(body.statusCode, 100, 599);
  if (body.delayMs !== undefined) data.delayMs = clamp(body.delayMs, 0, MAX_DELAY_MS);
  if (body.failureRate !== undefined) data.failureRate = clamp(body.failureRate, 0, 100);
  if (body.failureStatus !== undefined) data.failureStatus = clamp(body.failureStatus, 100, 599);
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.description !== undefined) data.description = String(body.description).slice(0, 500);

  try {
    const updated = await prisma.endpoint.update({ where: { id: existing.id }, data });
    return json(updated);
  } catch (err) {
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
      return fail(409, "That method and path already exist in this workspace");
    }
    return fail(500, "Could not update endpoint");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const existing = await ownedEndpoint(params.id);
  if (!existing) return fail(404, "Not found");
  await prisma.endpoint.delete({ where: { id: existing.id } });
  return json({ deleted: existing.id });
}

function clamp(value: unknown, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(Math.round(n), min), max);
}
