import { sampleId } from "./ids";

/**
 * AI generation.
 *
 * Called exactly once, when an endpoint is created, and never at request time.
 * The output is a preview: it is shown in an editable field and only written to
 * the database when the user presses Create. If the key is missing or the model
 * returns something that isn't JSON, `generate` falls back to a hand-written
 * skeleton so the create flow never dead-ends.
 */

export const MAX_DESCRIPTION = 500;

export interface Generation {
  schema: unknown;
  sample: unknown;
  source: "model" | "fallback";
  note?: string;
}

export class BadGenerationError extends Error {}

const SYSTEM = `You convert API descriptions into JSON. Return only a JSON object with two keys: "schema" (a JSON Schema draft-07 object describing the response) and "sample" (the actual response value conforming to that schema, containing 8 realistic records if it is a collection). Use realistic Indian names, plausible amounts in INR, and dates within the last 90 days. If the path contains a parameter such as :id, set the corresponding field in the sample to the literal string "{{id}}" so it is substituted at request time. Return no prose, no markdown fences.`;

export async function generate(input: {
  description: string;
  method: string;
  path: string;
}): Promise<Generation> {
  const description = input.description.trim().slice(0, MAX_DESCRIPTION);
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return { ...skeleton(input.method, input.path), source: "fallback", note: "AI is switched off — edit this and save, or paste your own JSON." };
  }

  try {
    // Groq's free tier: OpenAI-compatible chat completions, no billing
    // required. Get a key at console.groq.com.
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "openai/gpt-oss-20b",
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `${input.method} ${input.path}\n\n${description}` },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new BadGenerationError(`model returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? "";
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed: { schema?: unknown; sample?: unknown };
    try {
      parsed = JSON.parse(clean);
    } catch {
      throw new BadGenerationError(clean.slice(0, 200));
    }
    if (parsed.sample === undefined) throw new BadGenerationError("no sample in response");

    return { schema: parsed.schema ?? null, sample: parsed.sample, source: "model" };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    return {
      ...skeleton(input.method, input.path),
      source: "fallback",
      note: `Generation failed (${reason}). Here's a starting point — edit it and save.`,
    };
  }
}

/**
 * The manual path. A collection for a bare path, a single record for a path
 * that ends in a parameter, with the parameter already wired to {{id}}.
 */
export function skeleton(method: string, path: string): { schema: unknown; sample: unknown } {
  const segments = path.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  const param = last.startsWith(":") ? last.slice(1) : null;
  const noun = (segments.find((s) => !s.startsWith(":")) ?? "item").replace(/s$/, "");

  const record = {
    id: param ? `{{${param}}}` : sampleId(noun.slice(0, 3)),
    name: "Rohan Mehta",
    amount: 4820,
    status: "active",
    createdAt: "{{now}}",
  };

  const properties = {
    id: { type: "string" },
    name: { type: "string" },
    amount: { type: "number" },
    status: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
  };

  if (param || method === "POST") {
    return {
      schema: { $schema: "http://json-schema.org/draft-07/schema#", type: "object", properties },
      sample: record,
    };
  }

  return {
    schema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "array",
      items: { type: "object", properties },
    },
    sample: [
      record,
      { ...record, id: sampleId(noun.slice(0, 3)), name: "Ananya Iyer", amount: 1290, status: "pending" },
      { ...record, id: sampleId(noun.slice(0, 3)), name: "Kabir Nair", amount: 7340, status: "active" },
    ],
  };
}
