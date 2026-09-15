import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotYours, ownedWorkspace } from "@/lib/auth";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";

const PAGE = 50;
type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const workspace = await ownedWorkspace(params.id);
    const cursor = new URL(req.url).searchParams.get("cursor");

    const logs = await prisma.requestLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: PAGE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = logs.length > PAGE;
    return json({
      logs: hasMore ? logs.slice(0, PAGE) : logs,
      nextCursor: hasMore ? logs[PAGE - 1].id : null,
    });
  } catch (err) {
    if (err instanceof NotYours) return fail(404, "Not found");
    return fail(500, "Could not read the log");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const workspace = await ownedWorkspace(params.id);
    const { count } = await prisma.requestLog.deleteMany({ where: { workspaceId: workspace.id } });
    return json({ cleared: count });
  } catch (err) {
    if (err instanceof NotYours) return fail(404, "Not found");
    return fail(500, "Could not clear the log");
  }
}
