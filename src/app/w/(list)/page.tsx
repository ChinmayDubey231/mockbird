import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { appOrigin } from "@/lib/workspace";
import { AppFooter, Rail, SiteHeader } from "@/components/AppChrome";
import { WorkspaceList, type WorkspaceRow } from "@/components/WorkspaceList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Workspaces" };

export default async function WorkspaceIndex() {
  const user = await currentUser();
  const workspaces = user
    ? await prisma.workspace.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { endpoints: true } } },
      })
    : [];

  const rows: WorkspaceRow[] = workspaces.map((w) => ({
    id: w.id,
    key: w.key,
    name: w.name,
    endpoints: w._count.endpoints,
    createdAt: w.createdAt.toISOString(),
    expiresAt: w.expiresAt?.toISOString() ?? null,
  }));

  return (
    <div className="ds-page">
      <SiteHeader current="workspaces" />
      <Rail end={<span className="ds-hide-sm">Demo workspaces expire 24 hours after they&apos;re created</span>}>
        <span style={{ fontWeight: 600 }}>Your workspaces</span>
      </Rail>

      <main className="ds-shell ws-main">
        <WorkspaceList rows={rows} origin={appOrigin()} now={Date.now()} />
      </main>

      <AppFooter links />
    </div>
  );
}
