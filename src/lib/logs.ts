import { prisma } from "./prisma";

/** The log keeps at most this many rows, so the list can be read whole. */
export const LOG_LIST_LIMIT = 500;

/**
 * A workspace's log, newest first, without the heavy fields: headers, bodies
 * and the query are read one entry at a time, when it's opened. Shared by the
 * log page's first render and the API it polls, so both return the same rows.
 */
export async function listLogs(workspaceId: string) {
  const rows = await prisma.requestLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: LOG_LIST_LIMIT,
    select: {
      id: true,
      endpointId: true,
      method: true,
      path: true,
      statusCode: true,
      durationMs: true,
      delayMs: true,
      matched: true,
      note: true,
      createdAt: true,
    },
  });
  // Plain strings rather than Dates, so the rows cross to the browser the
  // same way whether they come from the page or from the API.
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export type LogSummary = Awaited<ReturnType<typeof listLogs>>[number];
