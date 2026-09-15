import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreakableUrl } from "@/components/BreakableUrl";
import { Mark } from "@/components/Mark";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { CopyButton } from "@/components/CopyButton";
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

  const base = mockUrl(workspace.key);

  return (
    <>
      <header className="topbar">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, color: "inherit" }}>
          <Mark />
          <span className="wordmark">Mockbird</span>
        </Link>
        <span style={{ color: "var(--ink-35)" }}>/</span>
        <span style={{ fontWeight: 500 }}>{workspace.name}</span>

        <span style={{ flex: 1, minWidth: 0 }} />

        <span className="base-url-pill">
          <code className="mono muted topbar-base-url" style={{ fontSize: 12 }}>
            <BreakableUrl value={base} />
          </code>
          <CopyButton value={base} label="Copy base URL" variant="ghost" hideLabelOnNarrow />
        </span>
        <ThemeSwitch />
      </header>

      <WorkspaceTabs workspaceKey={workspace.key} />

      <main className="shell" style={{ maxWidth: "none" }}>{children}</main>
    </>
  );
}
