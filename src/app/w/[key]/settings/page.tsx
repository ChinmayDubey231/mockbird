import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { workspaceForViewer } from "@/lib/workspace";
import { Settings } from "@/components/Settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params }: { params: { key: string } }) {
  const workspace = await workspaceForViewer(params.key);
  if (!workspace) notFound();

  const endpointCount = await prisma.endpoint.count({ where: { workspaceId: workspace.id } });

  return (
    <Settings
      workspaceId={workspace.id}
      workspaceKey={workspace.key}
      name={workspace.name}
      endpointCount={endpointCount}
    />
  );
}
