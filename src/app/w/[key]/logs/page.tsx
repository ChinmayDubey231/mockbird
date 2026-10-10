import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listLogs } from "@/lib/logs";
import { appOrigin, workspaceForViewer } from "@/lib/workspace";
import { RequestLog } from "@/components/RequestLog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Request log" };

export default async function LogsPage({ params }: { params: { key: string } }) {
  const workspace = await workspaceForViewer(params.key);
  if (!workspace) notFound();

  const [logs, routes] = await Promise.all([
    // The first page of the log comes with the page, so it opens with its
    // entries rather than a second wait for the browser to fetch them.
    listLogs(workspace.id),
    // Each entry names the endpoint that answered it; these say which route that is now.
    prisma.endpoint.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, method: true, path: true },
    }),
  ]);

  return (
    <RequestLog
      workspaceId={workspace.id}
      workspaceKey={workspace.key}
      origin={appOrigin()}
      routes={routes}
      initialLogs={logs}
      now={Date.now()}
    />
  );
}
