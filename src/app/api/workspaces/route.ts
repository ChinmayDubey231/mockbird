import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, currentUser } from "@/lib/auth";
import { workspaceKey } from "@/lib/ids";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return json([]);
  const workspaces = await prisma.workspace.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { endpoints: true, logs: true } } },
  });
  return json(workspaces);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = (await req.json().catch(() => ({}))) as { name?: string; ephemeral?: boolean };
  const name = (body.name ?? "Untitled workspace").trim().slice(0, 60) || "Untitled workspace";

  // Retry on the vanishingly rare key collision rather than checking first.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const workspace = await prisma.workspace.create({
        data: {
          name,
          key: workspaceKey(),
          userId: user.id,
          expiresAt: body.ephemeral ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
        },
      });
      return json(workspace, { status: 201 });
    } catch {
      /* try another key */
    }
  }
  return fail(500, "Could not allocate a workspace key");
}
