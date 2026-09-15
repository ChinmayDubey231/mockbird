import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotYours, ownedWorkspace } from "@/lib/auth";
import { validateEndpoint, ValidationError } from "@/lib/endpoints";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const workspace = await ownedWorkspace(params.id);
    const endpoints = await prisma.endpoint.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ path: "asc" }, { method: "asc" }],
    });
    return json(endpoints);
  } catch (err) {
    if (err instanceof NotYours) return fail(404, "Not found");
    return fail(500, "Could not list endpoints");
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const workspace = await ownedWorkspace(params.id);
    const input = validateEndpoint(await req.json());
    const endpoint = await prisma.endpoint.create({
      data: { ...input, workspaceId: workspace.id },
    });
    return json(endpoint, { status: 201 });
  } catch (err) {
    if (err instanceof NotYours) return fail(404, "Not found");
    if (err instanceof ValidationError) return fail(422, err.message);
    if (isUniqueViolation(err)) {
      return fail(409, "That method and path already exist in this workspace");
    }
    return fail(500, "Could not create endpoint");
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}
