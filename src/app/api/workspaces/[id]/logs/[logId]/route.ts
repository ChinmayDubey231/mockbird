import { prisma } from "@/lib/prisma";
import { NotYours, ownedWorkspace } from "@/lib/auth";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string; logId: string } };

/** One logged request in full: what was sent, and what went back. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const workspace = await ownedWorkspace(params.id);
    const log = await prisma.requestLog.findFirst({ where: { id: params.logId, workspaceId: workspace.id } });
    if (!log) return fail(404, "Not found");
    return json(log);
  } catch (err) {
    if (err instanceof NotYours) return fail(404, "Not found");
    return fail(500, "Could not read that request");
  }
}
