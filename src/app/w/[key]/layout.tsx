import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppFooter, Rail, WorkspaceHeader } from "@/components/AppChrome";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";
import { mockUrl, workspaceForViewer } from "@/lib/workspace";

export async function generateMetadata({ params }: { params: { key: string } }): Promise<Metadata> {
  const workspace = await workspaceForViewer(params.key);
  if (!workspace) return {};
  return { title: { template: `%s · ${workspace.name}`, default: workspace.name } };
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { key: string };
}) {
  const workspace = await workspaceForViewer(params.key);
  if (!workspace) notFound();

  const recent = await prisma.requestLog.count({
    where: { workspaceId: workspace.id, createdAt: { gte: new Date(Date.now() - 24 * 3600e3) } },
  });

  return (
    <div className="ds-page">
      <WorkspaceHeader name={workspace.name} base={mockUrl(workspace.key)} workspaceKey={workspace.key} />

      {/* The rail: the workspace's sections, and how busy it has been. */}
      <Rail
        end={
          <span className="ds-hide-sm">
            {recent.toLocaleString("en-US")} {recent === 1 ? "request" : "requests"} in the last 24 hours
          </span>
        }
      >
        <WorkspaceTabs workspaceKey={workspace.key} />
      </Rail>

      <main className="ds-shell ws-main">{children}</main>

      <AppFooter />
    </div>
  );
}
