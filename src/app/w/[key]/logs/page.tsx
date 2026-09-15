import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { workspaceForViewer } from "@/lib/workspace";
import { LogTable } from "@/components/LogTable";
import { RequestChart } from "@/components/RequestChart";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Requests" };

export default async function LogsPage({ params }: { params: { key: string } }) {
  const workspace = await workspaceForViewer(params.key);
  if (!workspace) notFound();
  return (
    <div>
      <LogTable workspaceId={workspace.id} />
      <div style={{ marginTop: 18 }}>
        <RequestChart workspaceId={workspace.id} />
      </div>
    </div>
  );
}
