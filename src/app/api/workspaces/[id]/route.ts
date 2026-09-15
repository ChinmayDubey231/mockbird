import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotYours, ownedWorkspace } from "@/lib/auth";
import { cacheDelete } from "@/lib/cache";
import { workspaceKey } from "@/lib/ids";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const workspace = await ownedWorkspace(params.id);
    const body = (await req.json().catch(() => ({}))) as { name?: string; rotateKey?: boolean };

    const data: { name?: string; key?: string } = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 60);
    if (body.rotateKey) data.key = workspaceKey();

    const updated = await prisma.workspace.update({ where: { id: workspace.id }, data });
    // The old key must stop resolving immediately, not in 60 seconds.
    await cacheDelete(`ws:${workspace.key}`);
    return json(updated);
  } catch (err) {
    if (err instanceof NotYours) return fail(404, "Not found");
    return fail(500, "Could not update workspace");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const workspace = await ownedWorkspace(params.id);
    await prisma.workspace.delete({ where: { id: workspace.id } });
    await cacheDelete(`ws:${workspace.key}`);
    return json({ deleted: workspace.id });
  } catch (err) {
    if (err instanceof NotYours) return fail(404, "Not found");
    return fail(500, "Could not delete workspace");
  }
}
