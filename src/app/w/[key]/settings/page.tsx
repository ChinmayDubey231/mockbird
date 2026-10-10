import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { mockUrl, workspaceForViewer } from "@/lib/workspace";
import { Settings } from "@/components/Settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params }: { params: { key: string } }) {
  const workspace = await workspaceForViewer(params.key);
  if (!workspace) notFound();

  const now = Date.now();
  const [endpointCount, logCount, recentCount, gets] = await Promise.all([
    prisma.endpoint.count({ where: { workspaceId: workspace.id } }),
    prisma.requestLog.count({ where: { workspaceId: workspace.id } }),
    prisma.requestLog.count({
      where: { workspaceId: workspace.id, createdAt: { gte: new Date(now - 24 * 3600e3) } },
    }),
    prisma.endpoint.findMany({
      where: { workspaceId: workspace.id, method: "GET", isActive: true },
      orderBy: [{ path: "asc" }],
      select: { path: true },
    }),
  ]);
  // An example to go with the base URL: a GET that can be called as written,
  // so one without params when there is one.
  const example = gets.find((e) => !/[:*]/.test(e.path)) ?? gets[0] ?? null;

  return (
    <Settings
      workspaceId={workspace.id}
      workspaceKey={workspace.key}
      baseUrl={mockUrl(workspace.key)}
      name={workspace.name}
      createdAt={workspace.createdAt.toISOString()}
      expiresAt={workspace.expiresAt?.toISOString() ?? null}
      endpointCount={endpointCount}
      logCount={logCount}
      recentCount={recentCount}
      examplePath={example?.path ?? null}
      now={now}
    />
  );
}
