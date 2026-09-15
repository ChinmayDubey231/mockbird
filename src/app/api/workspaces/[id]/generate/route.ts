import { NextRequest } from "next/server";
import { NotYours, ownedWorkspace } from "@/lib/auth";
import { generate, MAX_DESCRIPTION } from "@/lib/ai";
import { rateLimitHit } from "@/lib/cache";
import { fail, json } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GENERATIONS_PER_HOUR = 30;

type Ctx = { params: { id: string } };

/** Preview only — this never writes to the database. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const workspace = await ownedWorkspace(params.id);
    const body = (await req.json().catch(() => ({}))) as {
      description?: string;
      method?: string;
      path?: string;
    };

    const description = (body.description ?? "").trim();
    if (!description) return fail(422, "Describe the response you want");
    if (description.length > MAX_DESCRIPTION) {
      return fail(422, `Keep the description under ${MAX_DESCRIPTION} characters`);
    }

    const used = await rateLimitHit(`gen:${workspace.userId}`, 3600);
    if (used > GENERATIONS_PER_HOUR) {
      return fail(429, "Too many generations this hour — write the JSON by hand for now");
    }

    const result = await generate({
      description,
      method: (body.method ?? "GET").toUpperCase(),
      path: body.path ?? "/",
    });
    return json(result);
  } catch (err) {
    if (err instanceof NotYours) return fail(404, "Not found");
    return fail(500, "Could not generate a response");
  }
}
