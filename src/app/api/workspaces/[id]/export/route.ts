import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotYours, ownedWorkspace } from "@/lib/auth";
import { validateEndpoint, ValidationError } from "@/lib/endpoints";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/** Download every endpoint as a single JSON file. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const workspace = await ownedWorkspace(params.id);
    const endpoints = await prisma.endpoint.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ path: "asc" }, { method: "asc" }],
      select: {
        method: true, path: true, description: true, schema: true, responseBody: true,
        statusCode: true, headers: true, delayMs: true, failureRate: true,
        failureStatus: true, failureBody: true, isActive: true,
      },
    });

    const payload = { mockbird: 1, workspace: workspace.name, endpoints };
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="${workspace.key}-endpoints.json"`,
      },
    });
  } catch (err) {
    if (err instanceof NotYours) return fail(404, "Not found");
    return fail(500, "Could not export");
  }
}

/** Re-import a previously exported file. Existing method+path pairs are replaced. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const workspace = await ownedWorkspace(params.id);
    const file = (await req.json()) as { endpoints?: unknown[] };
    if (!Array.isArray(file.endpoints)) return fail(422, "Expected an object with an endpoints array");

    let created = 0;
    const skipped: string[] = [];
    for (const raw of file.endpoints.slice(0, 200)) {
      try {
        const input = validateEndpoint(raw as never);
        await prisma.endpoint.upsert({
          where: {
            workspaceId_method_path: {
              workspaceId: workspace.id,
              method: input.method,
              path: input.path,
            },
          },
          create: { ...input, workspaceId: workspace.id },
          update: input,
        });
        created++;
      } catch (err) {
        skipped.push(err instanceof ValidationError ? err.message : "invalid entry");
      }
    }
    return json({ imported: created, skipped });
  } catch (err) {
    if (err instanceof NotYours) return fail(404, "Not found");
    return fail(500, "Could not import");
  }
}
