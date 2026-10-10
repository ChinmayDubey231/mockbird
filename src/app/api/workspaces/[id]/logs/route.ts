import { prisma } from "@/lib/prisma";
import { NotYours, ownedWorkspace } from "@/lib/auth";
import { listLogs } from "@/lib/logs";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/**
 * The whole log, newest first, without the heavy fields: headers, bodies and
 * the query come from /logs/:logId when an entry is opened. Small enough
 * that the request log page can poll it.
 */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const workspace = await ownedWorkspace(params.id);
    return json({ logs: await listLogs(workspace.id) });
  } catch (err) {
    if (err instanceof NotYours) return fail(404, "Not found");
    return fail(500, "Could not read the log");
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const workspace = await ownedWorkspace(params.id);
    const { count } = await prisma.requestLog.deleteMany({ where: { workspaceId: workspace.id } });
    return json({ cleared: count });
  } catch (err) {
    if (err instanceof NotYours) return fail(404, "Not found");
    return fail(500, "Could not clear the log");
  }
}
