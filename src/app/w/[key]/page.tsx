import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { appOrigin, workspaceForViewer } from "@/lib/workspace";
import { Dashboard, type EndpointDTO } from "@/components/Dashboard";

export const dynamic = "force-dynamic";

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

export default async function WorkspacePage({ params }: { params: { key: string } }) {
  const workspace = await workspaceForViewer(params.key);
  if (!workspace) notFound();

  const rows = await prisma.endpoint.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ path: "asc" }, { method: "asc" }],
  });

  const endpoints: EndpointDTO[] = rows.map((e) => ({
    id: e.id,
    method: e.method,
    path: e.path,
    description: e.description,
    responseBody: JSON.stringify(e.responseBody, null, 2),
    statusCode: e.statusCode,
    delayMs: e.delayMs,
    failureRate: e.failureRate,
    failureStatus: e.failureStatus,
    isActive: e.isActive,
    hitCount: e.hitCount,
    specificity: e.specificity,
  }));

  const requestsToday = await prisma.requestLog.count({
    where: {
      workspaceId: workspace.id,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  return (
    <Dashboard
      workspaceId={workspace.id}
      workspaceKey={workspace.key}
      origin={appOrigin()}
      initialEndpoints={endpoints}
      requestsToday={requestsToday}
    />
  );
}
