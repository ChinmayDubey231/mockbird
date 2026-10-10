import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { appOrigin, workspaceForViewer } from "@/lib/workspace";
import { Dashboard, type Activity, type EndpointDTO } from "@/components/Dashboard";

export const dynamic = "force-dynamic";

const HOUR = 3600e3;

// A page.tsx sharing its segment with layout.tsx has its metadata replace
// the layout's outright rather than fill the layout's title template (that
// only happens for genuinely nested children, e.g. settings/logs) — so this
// builds the full title itself instead of relying on the layout.
export async function generateMetadata({ params }: { params: { key: string } }): Promise<Metadata> {
  const workspace = await workspaceForViewer(params.key);
  const title = workspace ? `Endpoints · ${workspace.name}` : "Endpoints";
  // `absolute` opts out of the root layout's "%s · Mockbird" template, which
  // would otherwise wrap this (nothing at this segment consumed it, since
  // the co-located layout's own template was already bypassed above) —
  // keeps this in line with the settings/logs titles, which stop at the
  // workspace name too.
  return { title: { absolute: title } };
}

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: { key: string };
  searchParams: { endpoint?: string };
}) {
  const workspace = await workspaceForViewer(params.key);
  if (!workspace) notFound();

  const now = Date.now();
  const [rows, lastDay, latest] = await Promise.all([
    prisma.endpoint.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ path: "asc" }, { method: "asc" }],
    }),
    // The log keeps at most 500 rows, so a day of it is a small read.
    prisma.requestLog.findMany({
      where: { workspaceId: workspace.id, createdAt: { gte: new Date(now - 24 * HOUR) } },
      select: { createdAt: true },
    }),
    prisma.requestLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { method: true, path: true, statusCode: true, createdAt: true },
    }),
  ]);

  const endpoints: EndpointDTO[] = rows.map((e) => ({
    id: e.id,
    method: e.method,
    path: e.path,
    responseBody: JSON.stringify(e.responseBody, null, 2),
    statusCode: e.statusCode,
    delayMs: e.delayMs,
    failureRate: e.failureRate,
    failureStatus: e.failureStatus,
    isActive: e.isActive,
    specificity: e.specificity,
  }));

  // Hour by hour, oldest first, so the last bar is the hour now running.
  const hours = Array.from({ length: 24 }, () => 0);
  for (const log of lastDay) {
    const ago = Math.floor((now - log.createdAt.getTime()) / HOUR);
    if (ago >= 0 && ago < 24) hours[23 - ago]++;
  }

  const activity: Activity = {
    hours,
    recent: latest.map((l) => ({
      method: l.method,
      path: l.path,
      status: l.statusCode,
      at: l.createdAt.toISOString(),
    })),
  };

  return (
    <Dashboard
      workspaceId={workspace.id}
      workspaceKey={workspace.key}
      origin={appOrigin()}
      initialEndpoints={endpoints}
      initialActivity={activity}
      initialSelectedId={searchParams.endpoint}
      now={now}
    />
  );
}
