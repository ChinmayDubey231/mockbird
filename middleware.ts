import { NextRequest, NextResponse } from "next/server";
import { rateLimitHit } from "@/lib/cache";

/**
 * Rate limiting happens here rather than in the route handler, because the
 * workspace key is already in the URL. A workspace that is being hammered is
 * rejected before Postgres is touched and before the function does any work at
 * all — which is the whole point of the limit on a free tier.
 */
export const config = { matcher: "/m/:path*" };

const WINDOW_SECONDS = 60;

export async function middleware(req: NextRequest) {
  const key = req.nextUrl.pathname.split("/")[2];
  if (!key) return NextResponse.next();

  const limit = Number(process.env.MOCK_RATE_LIMIT ?? 60);
  const hits = await rateLimitHit(`rl:${key}`, WINDOW_SECONDS);

  if (hits > limit) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded for this workspace",
        limit: `${limit} requests per minute`,
        note: "Mockbird runs on a free tier. Raise MOCK_RATE_LIMIT if you host it yourself.",
      },
      { status: 429, headers: { "retry-after": String(WINDOW_SECONDS) } }
    );
  }

  const res = NextResponse.next();
  res.headers.set("x-ratelimit-limit", String(limit));
  res.headers.set("x-ratelimit-remaining", String(Math.max(0, limit - hits)));
  return res;
}
